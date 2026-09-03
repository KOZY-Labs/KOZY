import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Platform, StyleSheet, View, Dimensions, FlatList, Pressable } from 'react-native';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { startPersonaVerification } from '@/services/personaVerification';

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
import validateImage from '@/utils/mediaValidation';
import { formatDob, isValidDob, meetsMinimumAge, MIN_AGE } from '@/lib/dob.mjs';
import { GENDER_OPTIONS, PERSONALITY_OPTIONS, SEARCH_LIFESTYLE_OPTIONS } from '@/constants/data';
import { useAuth } from '@/context/AuthContext';
import { updateUserDoc } from '@/lib/db/users';
import { syncProfileCaches } from '@/lib/db/profileSync';
import { trustLevelFor } from '@/lib/trustLevel.mjs';
import { uploadUserAvatar } from '@/lib/utils/uploadMedia';
import { requestEmailChange } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth/errors';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.8;
const ITEM_SPACING = 12;
const MAX_PHOTOS = 3;


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
    const { focus } = useLocalSearchParams();
    const existingAvatar = useMemo(() => profile?.avatar ?? [], [profile?.avatar]);
    const genderDrawerRef = useRef(null);
    const personalityDrawerRef = useRef(null);
    const jobDrawerRef = useRef(null);
    const lifestyleDrawerRef = useRef(null);
    const aboutMeDrawerRef = useRef(null);
    const myVerificationDrawerRef = useRef(null);
    const verificationConfirmDrawerRef = useRef(null);
    const emailEditDrawerRef = useRef(null);
    const emailCheckDrawerRef = useRef(null);
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
    // Locked per field, not per account: a verified user whose stored field is still
    // blank (legacy signup data) must be able to fill it in, or the profile gate
    // would send them here forever with nothing editable.
    const identityLocked = {
      firstName: verified && !!profile?.firstName?.trim(),
      lastName: verified && !!profile?.lastName?.trim(),
      dob: verified && !!profile?.dob?.trim?.(),
    };
    const [verifying, setVerifying] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [showEmailPassword, setShowEmailPassword] = useState(false);
    const [emailError, setEmailError] = useState(null);
    const [changingEmail, setChangingEmail] = useState(false);
    // Unified photo list: existing avatar URLs carry `remoteUrl`; new picks are local assets.
    const [photos, setPhotos] = useState(() =>
      existingAvatar.map((url) => ({ uri: url, remoteUrl: url }))
    );
    const [photoError, setPhotoError] = useState(null);
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
    }, [firstName, lastName, dob, gender, job, personality, lifestylePreferences, aboutMe, photos, profile, existingAvatar]);

    const isDirtyRef = useRef(false);
    isDirtyRef.current = isDirty;

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

  const clearFieldError = (field) => {
    setErrors((current) => (current[field] ? { ...current, [field]: null } : current));
  };

  // First name is the public display name shown on listings and chats, so it can't be blank.
  // Each identity field is validated while it is still editable (not yet locked).
  const validate = () => {
    const nextErrors = {};

    if (!identityLocked.firstName && !firstName.trim()) {
      nextErrors.firstName = 'Enter your first name — this is the name other users see.';
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
    try {
      const result = await startPersonaVerification(uid);
      if (result.type === 'completed') {
        const updates = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          dob,
          verified: true,
          personaInquiryId: result.inquiryId ?? '',
        };
        updates.trustLevel = trustLevelFor({ ...profile, ...updates }); // verified → 3
        await updateUserDoc(uid, updates);
        // Denormalized copies get the just-written values; the context profile (and the
        // derived `verified`) updates via the users-doc subscription.
        await syncProfileCaches(uid, { ...profile, ...updates });
        verificationConfirmDrawerRef.current?.snapToIndex(0);
      } else if (result.type === 'pending') {
        if (result.inquiryId) {
          await updateUserDoc(uid, { personaInquiryId: result.inquiryId });
        }
        showAlertModal({
          title: 'Verification submitted',
          message: 'Your ID is being reviewed. Your profile will show as verified once it clears.',
        });
      } else if (result.type === 'failed') {
        showAlertModal({ title: 'Verification failed', message: 'We could not verify your ID. Please try again.' });
      }
      // 'cancel' — user closed the browser; no message needed.
    } catch (e) {
      showAlertModal({ title: 'Verification unavailable', message: e?.message ?? 'Please try again later.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleEmailChange = async () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (!emailPassword) {
      setEmailError('Enter your current password.');
      return;
    }
    setChangingEmail(true);
    setEmailError(null);
    try {
      await requestEmailChange(email, emailPassword);
      emailEditDrawerRef.current?.close();
      emailCheckDrawerRef.current?.snapToIndex(0);
      setNewEmail('');
      setEmailPassword('');
    } catch (e) {
      setEmailError(authErrorMessage(e));
    } finally {
      setChangingEmail(false);
    }
  };

  const addPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(`You can upload up to ${MAX_PHOTOS} profile photos.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlertModal({ title: 'Photo access required', message: 'Allow photo library access to add profile photos.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
        quality: 1,
      });

      if (result.canceled) return;

      const invalid = result.assets.find((asset) => validateImage(asset));
      if (invalid) {
        setPhotoError(validateImage(invalid));
        return;
      }

      setPhotos((prev) => [...prev, ...result.assets].slice(0, MAX_PHOTOS));
      setPhotoError(null);
    } catch {
      showAlertModal({ title: 'Unable to open gallery', message: 'Please try selecting your photos again.' });
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoError(null);
  };


  return (
    <View style={{ flex: 1, overflow: 'visible' }}>
      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="always"
        // Native keyboard insets: the focused field scrolls into view instead of
        // being covered (same pattern as stepOne).
        automaticallyAdjustKeyboardInsets
        renderItem={() => (
          <View style={styles.container}>
            <View style={styles.sliderContainer}>
              {/* Image carousel — scroll to the end and tap + to add (max 3 photos) */}
              <FlatList
                data={[
                  ...photos.map((p, index) => ({ key: `${p.uri}-${index}`, type: 'photo', uri: p.uri, index })),
                  ...(photos.length < MAX_PHOTOS ? [{ key: 'add', type: 'add' }] : []),
                ]}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                decelerationRate="fast"
                keyExtractor={(entry) => entry.key}
                contentContainerStyle={{
                  paddingVertical: 20,
                }}
                renderItem={({ item: entry }) => {
                  if (entry.type === 'add') {
                    return (
                      <Pressable
                        style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}
                        onPress={addPhoto}
                        accessibilityRole="button"
                        accessibilityLabel="Add a profile photo"
                      >
                        <View style={[styles.image, styles.addTile]}>
                          <Feather name="plus" size={40} color={colors.semantic.text.primary} />
                          <AppText variant="body-xsm" style={{ color: colors.base.gray600 }}>
                            {photos.length + 1}/{MAX_PHOTOS} photos
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  }

                  return (
                    <View style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}>
                      <Image
                        source={{ uri: entry.uri }}
                        style={styles.image}
                        contentFit="cover"
                      />
                      <Pressable
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(entry.index)}
                        accessibilityRole="button"
                        accessibilityLabel="Remove this photo"
                        hitSlop={8}
                      >
                        <Feather name="x" size={16} color={colors.base.white} />
                      </Pressable>
                    </View>
                  );
                }}
              />
              {photoError ? <ErrorMessage message={photoError} /> : null}
            </View>
            {/* Help Text */}
            <DisplayField title="My Profile" style={{ marginBottom: 16 }}>
              Keeping your ID, photo, and profile details up to date helps us build trust in the KOZY community.
            </DisplayField>

            {/* Identity — each field is editable until Persona verification locks it.
                Fields still blank at verification time stay editable (legacy data). */}
            {[
              { key: 'firstName', label: 'First Name', value: firstName, set: setFirstName, placeholder: 'First Name' },
              { key: 'lastName', label: 'Last Name', value: lastName, set: setLastName, placeholder: 'Last Name' },
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
            )}
            {verified ? (
              <AppText variant="body-xsm" style={styles.lockedCaption}>
                Verified via Persona — your legal name and date of birth can no longer be edited.
              </AppText>
            ) : null}
            <FormField label="Gender">
              <DisplayInput
                value={gender}
                placeholder="Select an option"
                onPress={() => genderDrawerRef.current?.snapToIndex(0)}
                rightIcon={<Feather name="chevron-down" size={22} color={colors.semantic.text.primary} />}
                accessibilityLabel="Gender Preference filter"
              />
            </FormField>
            <FormField label="Job or Profession">
              <DisplayInput
                value={job}
                placeholder="Enter your job or profession"
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
            <View style={styles.idVerificationContainer}>
              <AppText variant="body-sm-strong" color="primary">
                ID Verification
              </AppText>
              {verified ? (
                <View style={styles.verifiedBadge}>
                  <Feather name="check-circle" size={16} color={colors.base.success} />
                  <AppText variant="body-sm-strong" style={{ color: colors.base.success }}>
                    Verified
                  </AppText>
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
            </View>
            <View style={styles.emailContainer}>
              <FormField label="My Email" style={styles.emailField}>
                <DisplayInput
                  value={profile?.email}
                  placeholder="Please Verify your email."
                />
              </FormField>
              <View style={styles.emailButtonContainer}>
                  <AppButton
                    text="Edit Email"
                    size="sm"
                    type='primary'
                    onPress={() => emailEditDrawerRef.current?.snapToIndex(0)}
                  />
                </View>
            </View>
            <View style={{ marginTop: 32 }}>
              <AppButton
                text="Save Changes"
                loading={saving}
                loadingLabel="Saving"
                onPress={saveProfile}
              />
            </View>
          </View>
        )}
      />
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
            title="What do you do for work?"
            description="Tell us what your profession is."
            primaryAction={() => {
              jobDrawerRef.current?.close();             
            }}
          >
            <FormField label="">
              <InputRow>
                <TextField placeholder="ex: Software Engineer" value={job} onChangeText={setJob}/>
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
            <AppText variant='body-xsm' style={{ marginBottom: 16, textAlign: 'center' }}>
              For security and trust, please verify your identity. This only takes a few minutes.
            </AppText>
            {/* Verification saves and permanently locks these values — show exactly
                what will be locked so unsaved edits can't slip through unseen. */}
            <AppText variant='body-sm-strong' style={{ marginBottom: 16, textAlign: 'center' }}>
              This will be locked as:{'\n'}{firstName.trim()} {lastName.trim()}, born {dob}
            </AppText>
            <AppText variant='body-xsm' style={{ textAlign: 'center' }}>
            *We use Persona to securely verify your ID.
            </AppText>
      </AppDrawer>
      <AppDrawer
            ref={verificationConfirmDrawerRef}
            title="Your Identity verified"
            description="Your ID has been verified successfully."
            align="center"
            primaryActionText="Done"
            primaryAction={() => verificationConfirmDrawerRef.current?.close()}
          >
      </AppDrawer>
      <AppDrawer
            ref={emailEditDrawerRef}
            title="Update email address"
            align="center"
            description="Enter your new email and current password"
            primaryActionText={changingEmail ? 'Sending...' : 'Send Verification Link'}
            primaryAction={handleEmailChange}
          >
            <View>
              <AppText variant='body-xsm'>
                ✶ We’ll send a verification link to your new email.
              </AppText>
              <AppText variant='body-xsm'>
                ✶ Your login email changes only after you open that link.
              </AppText>
            </View>
            <View style={{ marginTop: 32 }}>
              <FormField label="" error={emailError}>
                <InputRow>
                  <TextField
                    placeholder="New email address"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    error={!!emailError}
                    value={newEmail}
                    onChangeText={(text) => {
                      setNewEmail(text);
                      setEmailError(null);
                    }}
                  />
                </InputRow>
              </FormField>
              <FormField label="">
                <InputRow>
                  <TextField
                    placeholder="Current password"
                    secureTextEntry={!showEmailPassword}
                    autoCapitalize="none"
                    rightIcon={
                      <MaterialIcons
                        name={showEmailPassword ? 'visibility-off' : 'visibility'}
                        size={20}
                        color={colors.semantic.input.textDisabled}
                      />
                    }
                    onRightIconPress={() => setShowEmailPassword((value) => !value)}
                    rightIconAccessibilityLabel={showEmailPassword ? 'Hide password' : 'Show password'}
                    error={!!emailError}
                    value={emailPassword}
                    onChangeText={(text) => {
                      setEmailPassword(text);
                      setEmailError(null);
                    }}
                  />
                </InputRow>
              </FormField>
            </View>
      </AppDrawer>
      <AppDrawer
            ref={emailCheckDrawerRef}
            title="Check your inbox"
            align="center"
            description="We’ve sent a verification link to your new email. Open it to finish the change, then log in again with your new email."
            primaryActionText="Done"
            primaryAction={() => {
              emailCheckDrawerRef.current?.close()
            }}
          >
      </AppDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
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
  emailContainer:{
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  emailField: {
    flex: 1,
    minWidth: 0,
  },
  emailButtonContainer: {
    width: 104,
    flexShrink: 0,
    marginBottom: 20,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
  },
  sliderContainer: {
    position: 'relative',
  },
  addTile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.semantic.input.border.normal.color,
    backgroundColor: colors.semantic.bg.greyAlpha,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
