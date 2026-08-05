import { View, Text, StyleSheet, Platform, FlatList, Image, Dimensions, ScrollView } from 'react-native';
import { router  } from 'expo-router';
import React, { useMemo, useState } from 'react';

import { useListingDraft } from '@/context/ListingDraftContext';
import { useAuth } from '@/context/AuthContext';
import { draftToPreview, normalizeDraft, ownerFromProfile } from '@/lib/listingDraft';
import { createListing, updateListing, deleteListing } from '@/lib/db/listings';
import { uploadListingImages, uploadListingVideo } from '@/lib/utils/uploadMedia';
import DisplayField from '@/components/ui/displayField';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import ProfileSection from '@/components/ui/profileSection';
import ListingLocationMap from '@/components/ui/listingLocationMap';
import { showAlertModal } from '@/components/ui/confirmModalHost';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [publishing, setPublishing] = useState(false);
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

  // Edit flow: write back onto the existing doc. Media already in Storage is reused —
  // uploadListing* skips assets that carry a remoteUrl — so only new picks upload.
  const handleUpdate = async () => {
    if (!uid) {
      showAlertModal({ title: 'Sign in required', message: 'Please log in again to update your listing.' });
      return;
    }
    const problem = findDraftProblem(draft);
    if (problem) {
      showAlertModal({ title: 'Listing incomplete', message: problem });
      return;
    }
    setPublishing(true);
    try {
      const images = draft.photos?.length ? await uploadListingImages(editingId, draft.photos) : [];
      const videoUrl = draft.video ? await uploadListingVideo(editingId, draft.video) : '';
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
    if (!uid) {
      showAlertModal({ title: 'Sign in required', message: 'Please log in again to publish your listing.' });
      return;
    }
    const problem = findDraftProblem(draft);
    if (problem) {
      showAlertModal({ title: 'Listing incomplete', message: problem });
      return;
    }
    setPublishing(true);
    let createdId = null;
    try {
      // 1) create the listing as a draft (gives us an id for the media paths)
      const payload = normalizeDraft(draft);
      createdId = await createListing({ ...payload, ownerId: uid, owner: ownerFromProfile(profile), status: 'draft' });
      // 2) upload media to listings/{id}/...
      const images = draft.photos?.length ? await uploadListingImages(createdId, draft.photos) : [];
      const videoUrl = draft.video ? await uploadListingVideo(createdId, draft.video) : '';
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
    <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant='headline-sm'>{item.title}</AppText>
        <AppText variant='body-sm'>${item.price}</AppText>
      {/* Slider */}
      <FlatList
        data={item.images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, index) => `${uri}-${index}`}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH
          );
          setActiveIndex(index);
        }}
        style={styles.slider}
        renderItem={({ item: image }) => (
          <View style={{ width: SCREEN_WIDTH - 32 }}>
            <Image
              source={{ uri: image }}
              style={styles.fullImage}
              resizeMode="cover"
            />
          </View>
        )}
      />
      <View style={styles.pagination}>
        {item.images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              activeIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>
      
      {/* Details */}
        <View style={styles.content}>
          <DisplayField title="Location">
            {`${item.street}, ${item.city}, ${item.province}`}
          </DisplayField>
          {/* Tap opens a full-screen map with just this listing's pin */}
          <ListingLocationMap latitude={item.latitude} longitude={item.longitude} />

          {/* Owner */}
          <View style={styles.section}>
            <AppText variant='headline-sm'>Meet Your Roomate</AppText>
            <ProfileSection userId={item.owner.id} listing={item} />
            <DisplayField title="About Room & House" type="pill">
              {[`${item.bedrooms} Bed`, `${item.bathrooms} Bath`, `${item.roomType}`, `${item.sizeSqft} sqft`, item.furnished ? 'Furnished' : 'Unfurnished', ...item.roomDetail]}
            </DisplayField>

            <DisplayField title="Looking For" type="pill">
              {item.lookingFor}
            </DisplayField>

            {item.description ? (
              <DisplayField title="Description">
                {item.description}
              </DisplayField>
            ) : null}
            <AppText variant="body-sm-strong">Move-in Details</AppText>
            <AppText variant='body-sm' style={{lineHeight: 14}}>• {item.availableFrom}</AppText>
            <AppText variant='body-sm' style={{lineHeight: 14}}>• Rent: ${item.price} / {item.leaseType === "Month-to-Month" ? "Month" : "Fixed Term"}</AppText>
            <AppText variant='body-sm' style={{lineHeight: 14}}>• Utility: {item.utilityIncluded ? 'Included' : 'Not Included'}</AppText>
            <AppText variant='body-sm' style={{lineHeight: 14}}>• Deposit: ${item.deposit}</AppText>
          </View>
        </View>
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
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: 'black', 
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
    overflow: 'hidden'
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  slider:{
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 6,
  },
  price: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  location: {
    color: '#bbb',
    marginBottom: 12,
  },
  mapContainer: {
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
  },
  description: {
    color: 'white',
    lineHeight: 20,
    marginBottom: 16,
  },
  specRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  spec: {
    color: 'white',
  },
  section: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
  },
  amenity: {
    color: '#ccc',
    marginBottom: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  ownerName: {
     display: 'flex', 
     flexDirection: 'column', 
     justifyContent: 'center', 
     alignItems: 'center', 
     gap: 4
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '50%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 9999,
    marginHorizontal: 'auto'
  },
  mapImage: {
    width: '100%',
    height: 78,
    borderRadius: 4,
  },
  content: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#ffffff',
    marginVertical: 8,
  },
  fullImage: {
    width: '100%',
    height: 260,
    borderRadius: 0,
  },
  
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  
  activeDot: {
    backgroundColor: 'white',
    width: 8,
    height: 8,
  },
});
