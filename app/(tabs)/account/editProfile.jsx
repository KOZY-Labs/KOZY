import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  startPersonaVerification,
  setAwaitingVerification,
  consumeAwaitingVerification,
} from '@/services/personaVerification';

import PillGroup from '@/components/ui/pill/pillGroup';
import AppText from '@/components/ui/appText';
import FormField from '@/components/ui/form/formField';
import InputRow from '@/components/ui/layout/inputRow';
import DisplayField from '@/components/ui/displayField';
import AppDrawer from '@/components/ui/drawer/AppDrawer';
import DisplayInput from '@/components/ui/input/displayInput';
import { colors } from '@/constants/colors';
import Dropdown from '@/components/ui/input/dropdown';
import TextField from '@/components/ui/input/textField';
import TextArea from '@/components/ui/input/textArea';
import AppButton from '@/components/ui/appButton';
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import ErrorMessage from '@/components/ui/form/errorMessage';
import { avatarSource } from '@/lib/avatar';
import HeaderBackButton from '@/components/navigation/headerBackButton';
import StickyFooter, { stickyFooterOffset, useStickyFooterPadding } from '@/components/ui/layout/stickyFooter';
import MediaViewerModal from '@/components/ui/mediaViewerModal';
import validateImage from '@/utils/mediaValidation';
import { formatDob, isValidDob, meetsMinimumAge, MIN_AGE } from '@/lib/dob.mjs';
import {
  GENDER_OPTIONS,
  PERSONALITY_OPTIONS,
  SEARCH_LIFESTYLE_OPTIONS,
  DISPLAY_NAME_MIN_LEN,
  DISPLAY_NAME_MAX_LEN,
  LEGAL_NAME_MAX_LEN,
} from '@/constants/data';
import { useAuth } from '@/context/AuthContext';
import { updateUserDoc } from '@/lib/db/users';
import { syncProfileCaches } from '@/lib/db/profileSync';
import { trustLevelFor } from '@/lib/trustLevel.mjs';
import { uploadUserAvatar } from '@/lib/utils/uploadMedia';
import { openTerms } from '@/lib/links';
import DismissKeyboard from '@/components/ui/layout/dismissKeyboard';


// Single photo: only the first avatar entry is ever shown anywhere in the app,
// so the profile keeps exactly one. Legacy 3-photo profiles show (and keep) just
// the first; saving persists only that one.

// Verification-flow announcements fire right as the Persona auth-session browser is
// closing. On iOS, presenting an RN Modal while that view controller is still
// animating away leaves it invisible but touch-blocking — so hold every one of them
// until the dismissal has finished.
function announceVerification(options) {
  setTimeout(() => showAlertModal(options), 700);
}


// Gate: the form seeds all of its state (including the photo list) from `profile`
// in one-shot useState initializers, so mounting it while the profile doc is still
// loading would start from blanks and a Save could wipe the user's real data.
// AuthContext retries a missing profile on its own; we just wait for it here.
export default function EditProfile() {
  const { profile, initializing, refreshProfile } = useAuth();
  // The live users-doc subscription normally delivers the profile within moments. If it
  // hasn't after 8s, show a persistent hint + Retry ALONGSIDE the spinner — one-shot
  // state, never reset, so there is no re-arm machinery to get wrong. The moment the
  // profile arrives (subscription or Retry), the form renders and this is moot.
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (profile) return undefined;
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [profile]);

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        {initializing || <ActivityIndicator color={colors.base.white} />}
        {timedOut ? (
          <>
            <AppText variant="body-md" color="primary" style={{ textAlign: 'center', marginVertical: 16 }}>
              We couldn’t load your profile.{'\n'}Check your connection and try again.
            </AppText>
            <View style={{ width: 160 }}>
              <AppButton
                text="Retry"
                type="secondary"
                onPress={() => refreshProfile().catch(() => {})}
              />
            </View>
          </>
        ) : null}
      </View>
    );
  }

  return <EditProfileForm />;
}

function EditProfileForm() {
    const { profile, uid } = useAuth();
    const { focus, backTo } = useLocalSearchParams();
    const footerPadding = useStickyFooterPadding();
    // Sliced to the photo cap so a legacy multi-photo profile doesn't read as
    // "dirty" (and prompt to discard) before the user touches anything.
    const existingAvatar = useMemo(
      () => (profile?.avatar ?? []).slice(0, 1),
      [profile?.avatar]
    );
    const genderDrawerRef = useRef(null);
    const personalityDrawerRef = useRef(null);
    const jobDrawerRef = useRef(null);
    const lifestyleDrawerRef = useRef(null);
    const aboutMeDrawerRef = useRef(null);
    const myVerificationDrawerRef = useRef(null);
    // Public display name — never locked (unlike the legal name below).
    const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
    const [firstName, setFirstName] = useState(profile?.firstName ?? '');
    const [lastName, setLastName] = useState(profile?.lastName ?? '');
    const [dob, setDob] = useState(profile?.dob ?? '');
    const [personality, setPersonality] = useState(profile?.personality ?? []);
    const [lifestylePreferences, setLifestylePreferences] = useState(profile?.lifestyle ?? []);
    const [gender, setGender] = useState(profile?.gender ?? null);
    const [job, setJob] = useState(profile?.occupation ?? null);
    const [aboutMe, setAboutMe] = useState(profile?.aboutMe ?? '');
    // One message per field so each FormField explains its own problem.
    const [errors, setErrors] = useState({});
    // Derived, not copied: the live users-doc subscription keeps profile current, so a
    // second state would only invite the two drifting apart (e.g. an admin flip or a
    // Persona webhook landing mid-session).
    const verified = !!profile?.verified;
    // All-or-nothing: verification locks the whole legal identity. (A verified doc
    // with a blank identity field can't happen through the app; if data ever does,
    // it's fixed with an admin script, not per-field UI.)
    const identityLocked = { firstName: verified, lastName: verified, dob: verified };
    const [identityExpanded, setIdentityExpanded] = useState(false);
    const [verifying, setVerifying] = useState(false);
    // When a Persona inquiry was just submitted (module-level flag — the deep-link
    // return remounts this screen) and the webhook flips users.verified (via the
    // users-doc subscription), announce it exactly once. Also fires on mount when
    // the webhook won the race and verified is already true.
    // `!verifying` gate: the webhook often flips `verified` while the Persona sheet
    // is still on screen (its success page shows before the redirect). On iOS an RN
    // Modal presented while ASWebAuthenticationSession's view controller is up fails
    // silently but still blocks touches — so hold the announcement until the auth
    // session has fully resolved, then the effect re-runs with verifying === false.
    useEffect(() => {
      if (verified && !verifying && consumeAwaitingVerification()) {
        announceVerification({
          title: 'Identity verified 🎉',
          message: 'Your ID has been verified. Your profile now shows the verified badge.',
        });
      }
    }, [verified, verifying]);
    // Server-side identity check failed (ID approved by Persona, but the name or
    // DOB on it doesn't match this profile). Legal fields stay editable so the
    // user can correct them and retry.
    const personaStatus = profile?.persona?.status;
    useEffect(() => {
      if (personaStatus === 'mismatch' && !verifying && consumeAwaitingVerification()) {
        announceVerification({
          title: 'ID doesn’t match your profile',
          message: 'Persona finished checking your ID, but the name or date of birth on it doesn’t match your profile. Update your legal name or date of birth to match your ID, then verify again.',
        });
      }
    }, [personaStatus, verifying]);
    // Unified photo list: existing avatar URLs carry `remoteUrl`; new picks are local assets.
    const [photos, setPhotos] = useState(() =>
      existingAvatar.map((url) => ({ uri: url, remoteUrl: url }))
    );
    const [photoError, setPhotoError] = useState(null);
    // Fullscreen photo viewer (same lightbox as chat media).
    const [viewerMedia, setViewerMedia] = useState(null);
    const [saving, setSaving] = useState(false);

    // Tab bar visibility is handled centrally in (tabs)/_layout.jsx.

    // ----- Unsaved-changes guard -----
    const navigation = useNavigation();
    const pendingNavRef = useRef(null); // navigation action blocked by the guard
    const allowLeaveRef = useRef(false); // set after save/discard so leaving isn't re-blocked

    const isDirty = useMemo(() => {
      const photosChanged =
        photos.length !== existingAvatar.length ||
        photos.some((p, i) => p.remoteUrl !== existingAvatar[i]);
      return (
        displayName !== (profile?.displayName ?? '') ||
        firstName !== (profile?.firstName ?? '') ||
        lastName !== (profile?.lastName ?? '') ||
        dob !== (profile?.dob ?? '') ||
        (gender || null) !== (profile?.gender || null) ||
        (job || null) !== (profile?.occupation || null) ||
        JSON.stringify(personality) !== JSON.stringify(profile?.personality ?? []) ||
        JSON.stringify(lifestylePreferences) !== JSON.stringify(profile?.lifestyle ?? []) ||
        aboutMe !== (profile?.aboutMe ?? '') ||
        photosChanged
      );
    }, [displayName, firstName, lastName, dob, gender, job, personality, lifestylePreferences, aboutMe, photos, profile, existingAvatar]);

    const isDirtyRef = useRef(false);
    isDirtyRef.current = isDirty;
    // Display name is the one required field — Save stays disabled until it's valid.
    const displayNameOk =
      displayName.trim().length >= DISPLAY_NAME_MIN_LEN && displayName.trim().length <= DISPLAY_NAME_MAX_LEN;

    // Deep-focus: arriving with ?focus=verify (Trust Level CTA) opens the Persona
    // drawer directly. Small delay lets the bottom sheet finish mounting.
    useEffect(() => {
      const target = Array.isArray(focus) ? focus[0] : focus;
      if (target !== 'verify' || profile?.verified) return undefined;
      const timer = setTimeout(() => myVerificationDrawerRef.current?.snapToIndex(0), 400);
      return () => clearTimeout(timer);
      // Run once on mount for the arrival param.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Intercept every way of leaving (header back, swipe gesture, hardware back)
    // and show the discard modal while there are unsaved changes.
    useEffect(() => {
      const discardChanges = () => {
        allowLeaveRef.current = true;
        const action = pendingNavRef.current;
        pendingNavRef.current = null;
        if (action) navigation.dispatch(action);
      };
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (allowLeaveRef.current || !isDirtyRef.current) return;
        e.preventDefault();
        pendingNavRef.current = e.data.action;
        showConfirmModal({
          title: 'Discard changes?',
          message: 'You have unsaved changes. If you leave now, your edits will be lost.',
          primaryText: 'Keep Editing',
          secondaryText: 'Discard',
          onSecondary: discardChanges,
        });
      });
      return unsubscribe;
    }, [navigation]);

    // The header back button leaves via router.replace when a backTo param is set
    // (Complete-profile gate flows) — and `beforeRemove` cannot intercept a REPLACE,
    // so the unsaved-changes guard silently skipped that path. Own the button here,
    // where isDirty is visible, and run the same discard confirm before leaving.
    useEffect(() => {
      const leaveScreen = () => {
        allowLeaveRef.current = true;
        const target = typeof backTo === 'string' && backTo.length > 0 ? backTo : null;
        if (target) {
          router.replace(target);
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/account');
        }
      };
      navigation.setOptions({
        // This form is also mounted in the post stack (post/editProfile), where the
        // NATIVE back button is still on — leaving it would render two back buttons,
        // and a native pop races the JS guard ("removed natively but didn't get
        // removed from JS state"). Our headerLeft below is the only back control.
        headerBackVisible: false,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              if (isDirtyRef.current && !allowLeaveRef.current) {
                showConfirmModal({
                  title: 'Discard changes?',
                  message: 'You have unsaved changes. If you leave now, your edits will be lost.',
                  primaryText: 'Keep Editing',
                  secondaryText: 'Discard',
                  onSecondary: leaveScreen,
                });
                return;
              }
              leaveScreen();
            }}
          />
        ),
      });
    }, [navigation, backTo]);

  const clearFieldError = (field) => {
    setErrors((current) => (current[field] ? { ...current, [field]: null } : current));
  };

  // The displayName is the public display name shown on listings and chats, so it can't
  // be blank. Each legal-identity field is validated while still editable (not locked).
  const validate = () => {
    const nextErrors = {};

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      nextErrors.displayName = 'Enter a display name — this is the name other members see.';
    } else if (trimmedName.length < DISPLAY_NAME_MIN_LEN || trimmedName.length > DISPLAY_NAME_MAX_LEN) {
      nextErrors.displayName = `Display name must be ${DISPLAY_NAME_MIN_LEN}–${DISPLAY_NAME_MAX_LEN} characters.`;
    }

    if (!identityLocked.firstName && !firstName.trim()) {
      nextErrors.firstName = 'Enter your legal first name.';
    } else if (!identityLocked.firstName && firstName.trim().length < 2) {
      nextErrors.firstName = 'First name must be at least 2 characters.';
    }
    if (!identityLocked.lastName && !lastName.trim()) {
      nextErrors.lastName = 'Enter your last name.';
    }
    if (!identityLocked.dob) {
      if (!dob) {
        nextErrors.dob = 'Enter your date of birth.';
      } else if (!isValidDob(dob)) {
        nextErrors.dob = 'Enter a valid date as MM/DD/YYYY.';
      } else if (!meetsMinimumAge(dob)) {
        nextErrors.dob = `You must be at least ${MIN_AGE} years old to use KOZY.`;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveProfile = async () => {
    if (!uid) {
      showAlertModal({ title: 'Sign in required', message: 'Please log in again to update your profile.' });
      return;
    }
    if (!validate()) return;
    setSaving(true);
    try {
      // Upload newly picked photos; photos already in Storage keep their URL.
      const avatar = await Promise.all(
        photos.map((p) => (p.remoteUrl ? p.remoteUrl : uploadUserAvatar(uid, p)))
      );

      // Locked identity fields are never rewritten; unlocked ones save normally.
      // Locked fields keep their state equal to the stored value, so `name` below
      // is correct whichever combination is still editable.
      const identity = {};
      if (!identityLocked.firstName) identity.firstName = firstName.trim();
      if (!identityLocked.lastName) identity.lastName = lastName.trim();
      if (!identityLocked.dob) identity.dob = dob;
      if (!identityLocked.firstName || !identityLocked.lastName) {
        identity.name = `${firstName.trim()} ${lastName.trim()}`.trim();
      }

      const updates = {
        ...identity,
        displayName: displayName.trim(),
        gender: gender ?? '',
        occupation: job ?? '',
        personality,
        lifestyle: lifestylePreferences,
        aboutMe,
        avatar,
      };
      // Completing the profile is what advances Level 1 → 2.
      updates.trustLevel = trustLevelFor({ ...profile, ...updates });
      await updateUserDoc(uid, updates);
      // Push into denormalized copies (listings.owner, chats.participantsInfo) using the
      // values we just wrote — no re-read. The context profile updates via its own
      // users-doc subscription, so no manual refresh either.
      await syncProfileCaches(uid, { ...profile, ...updates });
      // Sync local state to what was persisted, so the unsaved-changes guard doesn't
      // fire for whitespace-only differences or freshly-uploaded photos.
      setDisplayName(updates.displayName);
      if (identity.firstName != null) setFirstName(identity.firstName);
      if (identity.lastName != null) setLastName(identity.lastName);
      setPhotos(avatar.map((url) => ({ uri: url, remoteUrl: url })));
      showAlertModal({
        title: 'Profile updated',
        message: 'Your changes have been saved.',
        onPress: () => {
          allowLeaveRef.current = true; // saved — don't re-prompt about unsaved changes
          router.back();
        },
      });
    } catch (e) {
      showAlertModal({ title: 'Update failed', message: e?.message ?? 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Persona hosted flow. Writes users.verified immediately on completion — verification
  // must not depend on the user also pressing Save Changes.
  const handleStartVerification = async () => {
    myVerificationDrawerRef.current?.close();
    // Verification locks the identity fields, so what gets locked must be valid and
    // persisted — otherwise unsaved edits would display as "verified" while Firestore
    // keeps the old values, with no way to ever reconcile them.
    if (!validate()) {
      showAlertModal({
        title: 'Check your details',
        message: 'Fix the highlighted name and date of birth fields before verifying your identity.',
      });
      return;
    }
    setVerifying(true);
    // Armed before the browser opens so the webhook can never beat it: however fast
    // users.verified flips, the (possibly remounted) screen finds the flag set and
    // opens the verified drawer. Cleared below on cancel/failure.
    setAwaitingVerification(true);
    try {
      const result = await startPersonaVerification(uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
      });
      if (result.type === 'completed' || result.type === 'pending') {
        // `verified` / `persona` / trustLevel 3 are server-only now: the
        // Persona webhook (functions/src/personaWebhook.js) writes them via the Admin
        // SDK once Persona confirms the inquiry, and Firestore rules reject these
        // fields from clients. Persist the identity fields that verification locks so
        // the locked values match what Persona saw; the verified badge appears on its
        // own through the users-doc subscription when the webhook lands.
        // No trustLevel here: the webhook may land before this write, and recomputing
        // from the (still-unverified) local profile would clobber its trustLevel 3
        // back down. The regular save flow recomputes it with the fresh profile.
        const updates = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          dob,
        };
        await updateUserDoc(uid, updates);
        await syncProfileCaches(uid, { ...profile, ...updates });
        // completed: stay quiet — the webhook flips users.verified within seconds and
        // the subscription effect above opens the verified drawer (the badge updates
        // on its own either way). needs_review can take a while, so say so.
        if (result.type === 'pending') {
          announceVerification({
            title: 'Verification submitted',
            message: 'Your ID is being reviewed. Your profile will show as verified once it clears.',
          });
        }
      } else {
        // failed / cancel / error below: no verification is coming — disarm the modal.
        setAwaitingVerification(false);
        if (result.type === 'failed') {
          announceVerification({ title: 'Verification failed', message: 'We could not verify your ID. Please try again.' });
        }
        // 'cancel' — user closed the browser; no message needed.
      }
    } catch (e) {
      setAwaitingVerification(false);
      announceVerification({ title: 'Verification unavailable', message: e?.message ?? 'Please try again later.' });
    } finally {
      setVerifying(false);
    }
  };

  // Picks (or replaces) the single profile photo.
  const addPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlertModal({ title: 'Photo access required', message: 'Allow photo library access to add profile photos.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (result.canceled) return;

      const invalid = result.assets.find((asset) => validateImage(asset));
      if (invalid) {
        setPhotoError(validateImage(invalid));
        return;
      }

      setPhotos([result.assets[0]]);
      setPhotoError(null);
    } catch {
      showAlertModal({ title: 'Unable to open gallery', message: 'Please try selecting your photos again.' });
    }
  };

  const removePhoto = () => {
    setPhotos([]);
    setPhotoError(null);
  };

  const avatar = photos[0] ?? null;
  const avatarUri = avatar ? avatar.previewUri ?? avatar.uri : null;
  const handleAvatarMenu = () => {
    showConfirmModal({
      title: 'Profile photo',
      primaryText: 'Change photo',
      secondaryText: 'Remove photo',
      tertiaryText: 'Cancel',
      onPrimary: addPhoto,
      onSecondary: removePhoto,
    });
  };


  // Legal identity fields, rendered in two places: inline inputs while unverified,
  // or read-only under the ID Verification row once verified.
  const identityFields = [
    { key: 'firstName', label: 'Legal First Name', value: firstName, set: setFirstName, placeholder: 'Legal First Name', maxLength: LEGAL_NAME_MAX_LEN, suffixText: `${firstName.length}/${LEGAL_NAME_MAX_LEN}` },
    { key: 'lastName', label: 'Legal Last Name', value: lastName, set: setLastName, placeholder: 'Legal Last Name', maxLength: LEGAL_NAME_MAX_LEN, suffixText: `${lastName.length}/${LEGAL_NAME_MAX_LEN}` },
    {
      key: 'dob',
      label: 'Date of Birth',
      value: dob,
      set: (text) => setDob(formatDob(text)),
      placeholder: 'MM/DD/YYYY',
      keyboardType: 'number-pad',
      maxLength: 10,
    },
  ].map(({ key, label, value, set, ...inputProps }) =>
    identityLocked[key] ? (
      <FormField key={key} label={label}>
        <DisplayInput
          value={value}
          rightIcon={<Feather name="lock" size={16} color={colors.semantic.text.disabled} />}
          accessibilityLabel={`${label} (locked after verification)`}
        />
      </FormField>
    ) : (
      <FormField key={key} label={label} error={errors[key]}>
        <TextField
          value={value}
          error={!!errors[key]}
          onChangeText={(text) => {
            set(text);
            clearFieldError(key);
          }}
          {...inputProps}
        />
      </FormField>
    )
  );

  return (
    <View style={{ flex: 1, overflow: 'visible' }}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingBottom: footerPadding }}
        // Focused field clears keyboard + sticky Save button (same as stepOne).
        bottomOffset={stickyFooterOffset(1) + 24}
      >
          <DismissKeyboard style={styles.container}>
            {/* Avatar preview exactly as other members see it — round frame plus the
                verified badge — with tap-to-view and a change/remove menu. */}
            <View style={styles.avatarSection}>
              <View>
                <Pressable
                  onPress={avatarUri ? () => setViewerMedia({ type: 'image', url: avatarUri }) : addPhoto}
                  accessibilityRole="button"
                  accessibilityLabel={avatarUri ? 'View profile photo' : 'Add profile photo'}
                >
                  <Image source={avatarSource(avatarUri)} style={styles.avatar} />
                </Pressable>
                {verified ? (
                  <View style={styles.avatarBadge} accessibilityLabel="Verified">
                    <Feather name="check-circle" size={18} color={colors.base.success} />
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={avatarUri ? handleAvatarMenu : addPhoto}
                accessibilityRole="button"
                hitSlop={8}
              >
                <AppText variant="body-sm-strong" style={styles.avatarAction}>
                  {avatarUri ? 'Edit photo' : 'Add photo'}
                </AppText>
              </Pressable>
              {photoError ? <ErrorMessage message={photoError} /> : null}
            </View>
            {/* Help Text */}
            <DisplayField style={{ marginBottom: 8 }}>
              Keeping your ID, photo, and profile details up to date helps us build trust in the KOZY community.
            </DisplayField>
            {/* The ID Verification row sits at the bottom of a long form — surface the
                nudge up here where new users actually look. */}
            {!verified ? (
              <Pressable
                onPress={() => myVerificationDrawerRef.current?.snapToIndex(0)}
                accessibilityRole="button"
                style={styles.verifyNudge}
              >
                <Feather name="shield" size={16} color={colors.base.success} />
                <AppText variant="body-xsm" style={styles.verifyNudgeText}>
                  Verify your identity to earn the Verified badge
                </AppText>
                <Feather name="chevron-right" size={16} color={colors.base.success} />
              </Pressable>
            ) : null}

            {/* Display name — public, always editable. */}
            <FormField label="Display Name" required error={errors.displayName}>
              <TextField
                value={displayName}
                error={!!errors.displayName}
                placeholder="Display Name"
                maxLength={DISPLAY_NAME_MAX_LEN}
                suffixText={`${displayName.length}/${DISPLAY_NAME_MAX_LEN}`}
                onChangeText={(text) => {
                  setDisplayName(text);
                  clearFieldError('displayName');
                }}
              />
            </FormField>
            <AppText variant="body-xsm" style={styles.fieldCaption}>
              This is the name other KOZY members will see.
            </AppText>

            {/* Legal identity — used only for verification, never shown publicly.
                Editable until Persona verification locks it; once verified the fields
                move under the ID Verification row (tap to expand, read-only). */}
            {!verified ? identityFields : null}
            <FormField label="Gender">
              <DisplayInput
                value={gender}
                placeholder="Select an option"
                onPress={() => genderDrawerRef.current?.snapToIndex(0)}
                rightIcon={<Feather name="chevron-down" size={22} color={colors.semantic.text.primary} />}
                accessibilityLabel="Gender"
              />
            </FormField>
            <FormField label="Occupation">
              <DisplayInput
                value={job}
                placeholder="Enter your occupation"
                onPress={() => jobDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
            <FormField label="Personality">
              <DisplayInput
                value={personality}
                isMulti={true}
                max={3}
                placeholder="+"
                onPress={() => personalityDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
            <FormField label="Lifestyle">
              <DisplayInput
                value={lifestylePreferences}
                isMulti={true}
                max={3}
                placeholder="+"
                onPress={() => lifestyleDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
            <FormField label="About Me">
              <DisplayInput
                value={aboutMe}
                placeholder="Tell us your story"
                onPress={() => aboutMeDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
            {/* Verified: the row itself expands to show the locked legal identity. */}
            <Pressable
              style={styles.idVerificationContainer}
              onPress={verified ? () => setIdentityExpanded((v) => !v) : undefined}
              disabled={!verified}
              accessibilityRole={verified ? 'button' : undefined}
              accessibilityState={verified ? { expanded: identityExpanded } : undefined}
            >
              <AppText variant="body-sm-strong" color="primary">
                ID Verification
              </AppText>
              {verified ? (
                <View style={styles.verifiedBadge}>
                  <Feather name="check-circle" size={16} color={colors.base.success} />
                  <AppText variant="body-sm-strong" style={{ color: colors.base.success }}>
                    Verified
                  </AppText>
                  <Feather
                    name={identityExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.semantic.text.primary}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              ) : (
                <View style={{ width: 92 }}>
                  <AppButton
                    text="Verify"
                    size="sm"
                    type='primary'
                    loading={verifying}
                    loadingLabel="Verifying"
                    onPress={() => myVerificationDrawerRef.current?.snapToIndex(0)}
                  />
                </View>
              )}
            </Pressable>
            {verified && identityExpanded ? (
              <View style={styles.identityExpanded}>
                {identityFields}
                <AppText variant="body-xsm" style={styles.lockedCaption}>
                  Verified via Persona — your legal name and date of birth can no longer be edited.
                </AppText>
              </View>
            ) : null}
          </DismissKeyboard>
      </KeyboardAwareScrollView>
      <StickyFooter>
        <AppButton
          text="Save Changes"
          loading={saving}
          loadingLabel="Saving"
          state={isDirty && displayNameOk ? 'normal' : 'disabled'}
          onPress={saveProfile}
        />
      </StickyFooter>
      {/* Drawers */}
      <AppDrawer
            ref={genderDrawerRef}
            title="What’s your gender?"
            primaryAction={() => {
              genderDrawerRef.current?.close();            }}
            // Wheel drawer: the sheet must not scroll or it steals the wheel's drag.
            scrollable={false}
          >
            <Dropdown
              value={gender}
              onChange={setGender}
              options={GENDER_OPTIONS}
            />
      </AppDrawer>
      <AppDrawer
            ref={jobDrawerRef}
            title="What do you do?"
            description="Job, school, or how you spend your days."
            primaryAction={() => {
              jobDrawerRef.current?.close();             
            }}
          >
            <FormField label="">
              <InputRow>
                <TextField placeholder="e.g. Software Engineer, Student" value={job} onChangeText={setJob}/>
              </InputRow>
            </FormField>
      </AppDrawer>
      <AppDrawer
            ref={personalityDrawerRef}
            title="What’s your personality like?"
            description="Let others know your vibe. Select words that reflect your personality."
            primaryAction={() => {
              personalityDrawerRef.current?.close();            }} 
          >
            <PillGroup
              items={PERSONALITY_OPTIONS}
              value={personality}
              onChange={setPersonality}
            />
      </AppDrawer>
      <AppDrawer
            ref={lifestyleDrawerRef}
            title="What’s your lifestyle like?"
            description="Your daily habits matter in shared spaces. Choose your lifestyle preferences."
            primaryAction={() => {
              lifestyleDrawerRef.current?.close();             }}
          >
            <PillGroup
              items={SEARCH_LIFESTYLE_OPTIONS}
              value={lifestylePreferences}
              onChange={setLifestylePreferences}
            />
      </AppDrawer>
      <AppDrawer
            ref={aboutMeDrawerRef}
            title="What your story?"
            description="Tell us what your short story."
            primaryAction={() => {
              aboutMeDrawerRef.current?.close();            }}
          >
            <FormField label="">
                <TextArea
                  placeholder="Tell us your story."
                  maxLength={300}
                  onChangeText={setAboutMe}
                  value={aboutMe}
                />
            </FormField>
      </AppDrawer>
      <AppDrawer
            ref={myVerificationDrawerRef}
            title="Verify Your Identity"
            align="center"
            primaryActionText="Start Verification"
            primaryAction={handleStartVerification}
          >
            <AppText variant='body-xsm' style={{ marginBottom: 12, textAlign: 'center' }}>
              Help keep the KOZY community safe by verifying your identity.
            </AppText>
            <AppText variant='body-xsm' style={{ marginBottom: 12, textAlign: 'center' }}>
              Your legal name and date of birth are used only for verification and will
              not be shown publicly. To change verified details later, contact us.
            </AppText>
            {/* Verification saves and permanently locks these values — show exactly
                what will be locked so unsaved edits can't slip through unseen. */}
            <AppText variant='body-sm-strong' style={{ marginBottom: 12, textAlign: 'center' }}>
              This will be locked as:{'\n'}{firstName.trim()} {lastName.trim()}, born {dob}
            </AppText>
            <AppText variant='body-xsm' style={{ textAlign: 'center' }}>
              Verification is securely provided by Persona. You may see a system prompt
              — tap Continue to open Persona.
            </AppText>
            <Pressable onPress={openTerms} accessibilityRole="link" hitSlop={8} style={{ marginTop: 12 }}>
              <AppText variant='body-xsm' style={{ textAlign: 'center', textDecorationLine: 'underline' }}>
                Terms of Service
              </AppText>
            </Pressable>
      </AppDrawer>
      <MediaViewerModal media={viewerMedia} onClose={() => setViewerMedia(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.base.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedCaption: {
    color: colors.semantic.text.disabled,
    marginBottom: 20,
  },
  verifyNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  verifyNudgeText: {
    flex: 1,
    color: colors.base.success,
  },
  fieldCaption: {
    color: colors.semantic.text.disabled,
    // Pull up under the field it explains (FormField carries its own 16px bottom
    // margin), then restore the normal field rhythm below.
    marginTop: -8,
    marginBottom: 20,
  },
  mapContainer: {
    marginBottom: 24,
  },
  text:{
    color: 'white',
  },
  searchInput: {
    height: 40,
    color: colors.semantic.input.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: colors.semantic.input.border.normal.color,
    borderBottomWidth: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idVerificationContainer:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginVertical: 24,
    borderTopWidth:1,
    borderBottomWidth:1,
    borderColor: colors.semantic.input.border.normal.color,
  },
  identityExpanded: {
    marginTop: -12,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.semantic.bg.grey,
  },
  // Same badge treatment as chat list / My Page, scaled to the larger avatar.
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 9999,
    padding: 3,
  },
  avatarAction: {
    color: colors.base.accent,
  },
});
