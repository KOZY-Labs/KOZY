import { View, Text, StyleSheet, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router  } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';

import AppText from '@/components/ui/appText';

import { useListingDraft } from '@/context/ListingDraftContext';
import { useAuth } from '@/context/AuthContext';
import { draftToPreview, normalizeDraft, ownerFromProfile } from '@/lib/listingDraft';
import { createListing, updateListing, deleteListing } from '@/lib/db/listings';
import { uploadListingImages, uploadListingVideo } from '@/lib/utils/uploadMedia';
import AppButton from '@/components/ui/appButton';
import ListingDetailBody from '@/components/ui/listingDetailBody';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import { isFiniteCoordinate } from '@/lib/geo/mapRegion';

const MIN_PHOTOS = 3;

// Last gate before anything is written to Firestore/Storage. A draft can still be incomplete
// here — the flow allows jumping back to any step — and a listing missing media or an address
// is broken in the feed, so name the step that needs fixing instead of publishing it.
function findDraftProblem(draft) {
  if (!draft.roomTitle?.trim()) {
    return 'Your listing needs a room title. Go back to step 1 to add one.';
  }
  if (!draft.street?.trim() || !draft.city?.trim() || !draft.province?.trim()) {
    return 'Your listing needs a full address. Go back to step 1 to add one.';
  }
  if (!draft.price) {
    return 'Your listing needs a monthly rent. Go back to step 1 to add one.';
  }
  // KOZY is home-based — a listing that can't be placed on the map is broken in
  // search (map-only surfaces), so publishing without coordinates is blocked.
  // isFiniteCoordinate rejects null/'' (Number(null) is 0 — the Null Island trap).
  if (!isFiniteCoordinate(draft.latitude) || !isFiniteCoordinate(draft.longitude)) {
    return 'We couldn’t locate this address on the map. Go back to step 1 and re-select the address from the suggestions.';
  }
  if ((draft.photos?.length ?? 0) < MIN_PHOTOS) {
    return `Your listing needs at least ${MIN_PHOTOS} photos. Go back to step 2 to add more.`;
  }
  if (!draft.video) {
    return 'Your listing needs a tour video. Go back to step 3 to add one.';
  }
  return null;
}

export default function PreviewListing() {
  const { draft, editingId, returnTo, resetDraft } = useListingDraft();
  const { profile, uid } = useAuth();
  const item = useMemo(() => draftToPreview(draft, profile), [draft, profile]);
  const [publishing, setPublishing] = useState(false);
  // 0..1 across every file in the batch, weighted by real bytes (native upload
  // tasks report sent/expected per file). Ref holds per-file counters so
  // concurrent callbacks don't race through setState.
  const [uploadPct, setUploadPct] = useState(0);
  const progressRef = useRef({});

  const trackProgress = (key, sent, total) => {
    progressRef.current[key] = { sent, total };
    const files = Object.values(progressRef.current);
    const totalBytes = files.reduce((acc, f) => acc + f.total, 0);
    if (!totalBytes) return;
    const sentBytes = files.reduce((acc, f) => acc + f.sent, 0);
    const pct = Math.min(1, sentBytes / totalBytes);
    // Progress events fire per chunk — only re-render on visible (1%) changes.
    setUploadPct((prev) => (pct - prev >= 0.01 || pct === 1 ? pct : prev));
  };

  const startPublishing = () => {
    progressRef.current = {};
    setUploadPct(0);
    setPublishing(true);
  };
  // Set once the listing is live so re-pressing the button re-opens the alert
  // instead of publishing a duplicate.
  const [publishedId, setPublishedId] = useState(null);
  const isEditing = !!editingId;

  const showUpdatedAlert = () => {
    // Capture before resetDraft() clears the edit state.
    const backTo = returnTo ?? `/(tabs)/account/myListings/detail/${editingId}`;
    showAlertModal({
      title: 'Your listing is updated ✅',
      message: 'Your changes are live.',
      buttonText: 'View My listing',
      onPress: () => {
        resetDraft();
        router.replace(backTo);
      },
    });
  };

  // Shared preflight for publish/update. Returns false when blocked.
  // The profile check matters: the owner cache is rebuilt from it on every write, and
  // ownerFromProfile(null) would wipe the listing's owner display data.
  const checkCanWrite = (action) => {
    if (!uid) {
      showAlertModal({ title: 'Sign in required', message: `Please log in again to ${action} your listing.` });
      return false;
    }
    if (!profile) {
      showAlertModal({
        title: 'Just a moment',
        message: 'Your profile is still loading. Please try again in a few seconds.',
      });
      return false;
    }
    const problem = findDraftProblem(draft);
    if (problem) {
      showAlertModal({ title: 'Listing incomplete', message: problem });
      return false;
    }
    return true;
  };

  // Media uploads are independent — run them concurrently (the video is usually the
  // large one and shouldn't wait for the images).
  const uploadMedia = (listingId) =>
    Promise.all([
      draft.photos?.length ? uploadListingImages(listingId, draft.photos, trackProgress) : [],
      draft.video ? uploadListingVideo(listingId, draft.video, trackProgress) : '',
    ]);

  // Edit flow: write back onto the existing doc. Media already in Storage is reused —
  // uploadListing* skips assets that carry a remoteUrl — so only new picks upload.
  const handleUpdate = async () => {
    if (!checkCanWrite('update')) return;
    startPublishing();
    try {
      const [images, videoUrl] = await uploadMedia(editingId);
      await updateListing(editingId, {
        ...normalizeDraft(draft),
        owner: ownerFromProfile(profile),
        images,
        videoUrl,
      });
      showUpdatedAlert();
    } catch (e) {
      showAlertModal({ title: 'Update failed', message: e?.message ?? 'Something went wrong. Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  const showPublishedAlert = (listingId) => {
    showAlertModal({
      title: 'Your listing is live 🎉',
      message: 'Your room is ready to be discovered. You can update it anytime.',
      buttonText: 'View My listing',
      onPress: () => {
        resetDraft();
        router.replace(`/(tabs)/post/uploadedPost/${listingId}`);
      },
    });
  };

  const handlePublish = async () => {
    if (publishedId) {
      showPublishedAlert(publishedId);
      return;
    }
    if (!checkCanWrite('publish')) return;
    startPublishing();
    let createdId = null;
    try {
      // 1) create the listing as a draft (gives us an id for the media paths)
      const payload = normalizeDraft(draft);
      createdId = await createListing({ ...payload, ownerId: uid, owner: ownerFromProfile(profile), status: 'draft' });
      // 2) upload media to listings/{id}/...
      const [images, videoUrl] = await uploadMedia(createdId);
      // 3) attach media + publish
      await updateListing(createdId, { images, videoUrl, status: 'published', publishedDate: new Date().toISOString() });
      setPublishedId(createdId);
      showPublishedAlert(createdId);
    } catch (e) {
      // Clean up the half-created draft so failed publishes don't leave orphans.
      if (createdId) {
        try { await deleteListing(createdId); } catch { /* best effort */ }
      }
      showAlertModal({ title: 'Publish failed', message: e?.message ?? 'Something went wrong. Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  if (!item) {
    return (
      <View style={styles.center}>
        <Text>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <ListingDetailBody listing={item} />
          <AppButton
            text="Edit Listing"
            type="secondary"
            style={{ marginBottom: 10 }}
            onPress={() => {router.push({
              pathname: '/(tabs)/post/stepOne',
              params: { id: item.id }
            })}}
          />
          <AppButton
            text={isEditing ? 'Save Changes' : 'Confirm & Publish'}
            type="primary"
            loading={publishing}
            loadingLabel={isEditing ? 'Saving' : 'Publishing'}
            onPress={isEditing ? handleUpdate : handlePublish}
          />
        </ScrollView>

      {/* Blocks every touch while media streams to Storage; the bar tracks real bytes. */}
      {publishing && (
        <View style={styles.publishOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <AppText variant="body-md-strong" textColor="#fff">
            {isEditing ? 'Saving…' : 'Posting…'}
          </AppText>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(uploadPct * 100)}%` }]} />
          </View>
          <AppText variant="caption" textColor="rgba(255,255,255,0.7)">
            {Math.round(uploadPct * 100)}%
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: 'black', 
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
    overflow: 'hidden'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  progressTrack: {
    width: '60%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});
