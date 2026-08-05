import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Dimensions, FlatList, Alert, Pressable } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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
import ConfirmModal from '@/components/ui/confirmModal';
import ErrorMessage from '@/components/ui/form/errorMessage';
import validateImage from '@/utils/mediaValidation';
import { useAuth } from '@/context/AuthContext';
import { updateUserDoc } from '@/lib/db/users';
import { syncProfileCaches } from '@/lib/db/profileSync';
import { uploadUserAvatar } from '@/lib/utils/uploadMedia';
import { requestEmailChange } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth/errors';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.8;
const ITEM_SPACING = 12;
const MAX_PHOTOS = 3;


export default function EditProfile() {
    const { profile, uid, refreshProfile } = useAuth();
    const existingAvatar = useMemo(() => profile?.avatar ?? [], [profile?.avatar]);
    const nicknameDrawerRef = useRef(null);
    const genderDrawerRef = useRef(null);
    const personalityDrawerRef = useRef(null);
    const jobDrawerRef = useRef(null);
    const lifestyleDrawerRef = useRef(null);
    const aboutMeDrawerRef = useRef(null);
    const myVerificationDrawerRef = useRef(null);
    const verificationConfirmDrawerRef = useRef(null);
    const emailEditDrawerRef = useRef(null);
    const emailCheckDrawerRef = useRef(null);
    const [nickname, setNickname] = useState(profile?.nickname ?? profile?.firstName ?? '');
    const [personality, setPersonality] = useState(profile?.personality ?? []);
    const [lifestylePreferences, setLifestylePreferences] = useState(profile?.lifestyle ?? []);
    const [gender, setGender] = useState(profile?.gender ?? null);
    const [job, setJob] = useState(profile?.occupation ?? null);
    const [aboutMe, setAboutMe] = useState(profile?.aboutMe ?? '');
    // One message per field so each FormField explains its own problem.
    const [errors, setErrors] = useState({});
    const [verified, setVerified] = useState(profile?.verified ?? false);
    const [verifying, setVerifying] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
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
    const [discardVisible, setDiscardVisible] = useState(false);
    const pendingNavRef = useRef(null); // navigation action blocked by the guard
    const allowLeaveRef = useRef(false); // set after save/discard so leaving isn't re-blocked

    const isDirty = useMemo(() => {
      const photosChanged =
        photos.length !== existingAvatar.length ||
        photos.some((p, i) => p.remoteUrl !== existingAvatar[i]);
      return (
        nickname !== (profile?.nickname ?? profile?.firstName ?? '') ||
        (gender || null) !== (profile?.gender || null) ||
        (job || null) !== (profile?.occupation || null) ||
        JSON.stringify(personality) !== JSON.stringify(profile?.personality ?? []) ||
        JSON.stringify(lifestylePreferences) !== JSON.stringify(profile?.lifestyle ?? []) ||
        aboutMe !== (profile?.aboutMe ?? '') ||
        photosChanged
      );
    }, [nickname, gender, job, personality, lifestylePreferences, aboutMe, photos, profile, existingAvatar]);

    const isDirtyRef = useRef(false);
    isDirtyRef.current = isDirty;

    // Intercept every way of leaving (header back, swipe gesture, hardware back)
    // and show the discard modal while there are unsaved changes.
    useEffect(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (allowLeaveRef.current || !isDirtyRef.current) return;
        e.preventDefault();
        pendingNavRef.current = e.data.action;
        setDiscardVisible(true);
      });
      return unsubscribe;
    }, [navigation]);

    const discardChanges = () => {
      setDiscardVisible(false);
      allowLeaveRef.current = true;
      const action = pendingNavRef.current;
      pendingNavRef.current = null;
      if (action) navigation.dispatch(action);
    };

  const clearFieldError = (field) => {
    setErrors((current) => (current[field] ? { ...current, [field]: null } : current));
  };

  // The nickname is the public display name shown on listings and chats, so it can't be blank.
  const validate = () => {
    const nextErrors = {};

    if (!nickname.trim()) {
      nextErrors.nickname = 'Enter a nickname — this is the name other users see.';
    } else if (nickname.trim().length < 2) {
      nextErrors.nickname = 'Nickname must be at least 2 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveProfile = async () => {
    if (!uid) {
      Alert.alert('Sign in required', 'Please log in again to update your profile.');
      return;
    }
    if (!validate()) return;
    setSaving(true);
    try {
      // Upload newly picked photos; photos already in Storage keep their URL.
      const avatar = await Promise.all(
        photos.map((p) => (p.remoteUrl ? p.remoteUrl : uploadUserAvatar(uid, p)))
      );

      await updateUserDoc(uid, {
        nickname: nickname.trim() || (profile?.firstName ?? ''),
        gender: gender ?? '',
        occupation: job ?? '',
        personality,
        lifestyle: lifestylePreferences,
        aboutMe,
        avatar,
      });
      // Push the fresh profile into denormalized copies (listings.owner, chats.participantsInfo).
      await syncProfileCaches(uid);
      await refreshProfile();
      Alert.alert('Profile updated', 'Your changes have been saved.', [
        {
          text: 'OK',
          onPress: () => {
            allowLeaveRef.current = true; // saved — don't re-prompt about unsaved changes
            router.back();
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Update failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Persona hosted flow. Writes users.verified immediately on completion — verification
  // must not depend on the user also pressing Save Changes.
  const handleStartVerification = async () => {
    myVerificationDrawerRef.current?.close();
    setVerifying(true);
    try {
      const result = await startPersonaVerification(uid);
      if (result.type === 'completed') {
        await updateUserDoc(uid, { verified: true, personaInquiryId: result.inquiryId ?? '' });
        await syncProfileCaches(uid);
        await refreshProfile();
        setVerified(true);
        verificationConfirmDrawerRef.current?.snapToIndex(0);
      } else if (result.type === 'pending') {
        if (result.inquiryId) {
          await updateUserDoc(uid, { personaInquiryId: result.inquiryId });
        }
        Alert.alert(
          'Verification submitted',
          'Your ID is being reviewed. Your profile will show as verified once it clears.'
        );
      } else if (result.type === 'failed') {
        Alert.alert('Verification failed', 'We could not verify your ID. Please try again.');
      }
      // 'cancel' — user closed the browser; no message needed.
    } catch (e) {
      Alert.alert('Verification unavailable', e?.message ?? 'Please try again later.');
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
        Alert.alert('Photo access required', 'Allow photo library access to add profile photos.');
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
      Alert.alert('Unable to open gallery', 'Please try selecting your photos again.');
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

            {/* Inputs */}
            <FormField label="Nickname" error={errors.nickname}>
              <DisplayInput
                value={nickname}
                placeholder="Enter your nickname"
                onPress={() => nicknameDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
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
                  <Feather name="check-circle" size={16} color="#4ADE80" />
                  <AppText variant="body-sm-strong" style={{ color: '#4ADE80' }}>
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
            ref={nicknameDrawerRef}
            title="What should we call you?"
            description="Your nickname is shown to other users instead of your full name."
            primaryAction={() => nicknameDrawerRef.current?.close()}
            snapPoints={['100%']}
            enableDynamicSizing={false}
          >
            <FormField label="" error={errors.nickname}>
              <InputRow>
                <TextField
                  placeholder="Enter your nickname"
                  value={nickname}
                  error={!!errors.nickname}
                  onChangeText={(text) => {
                    setNickname(text);
                    clearFieldError('nickname');
                  }}
                />
              </InputRow>
            </FormField>
      </AppDrawer>
      <AppDrawer
            ref={genderDrawerRef}
            title="What’s your gender?"
            primaryAction={() => {
              genderDrawerRef.current?.close();            }}
          >
            <Dropdown
              value={gender}
              onChange={setGender}
              options={[
                { label: "Female", value: "Female" },
                { label: "Male", value: "Male" },
                { label: "Non-binary", value: "Non-binary" },
              ]}
            />
      </AppDrawer>
      <AppDrawer
            ref={jobDrawerRef}
            title="What do you do for work?"
            description="Tell us what your profession is."
            snapPoints={['100%']}
            enableDynamicSizing={false}
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
              items={[
                { label: 'Friendly', value: 'Friendly' },
                { label: 'Independent', value: 'Independent' },
                { label: 'Calm', value: 'Calm' },
                { label: 'Respectful', value: 'Respectful' },
                { label: 'Introverted', value: 'Introverted' },
                { label: 'Extroverted', value: 'Extroverted' },
              ]}
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
              items={[
                { label: 'Early Bird', value: 'Early Bird' },
                { label: 'Night Owl', value: 'Night Owl' },
                { label: 'Homebody', value: 'Homebody' },
                { label: 'Out & About', value: 'Out & About' },
                { label: 'Clean & Tidy', value: 'Clean & Tidy' },
                { label: 'Easygoing', value: 'Easygoing' },
                { label: 'Smoker', value: 'Smoker' },
                { label: 'Non-Smoker', value: 'Non-Smoker' },
                { label: 'Work from Home', value: 'Work from Home' },
                { label: 'Go to Office', value: 'Go to Office' },
              ]}
              value={lifestylePreferences}
              onChange={setLifestylePreferences}
            />
      </AppDrawer>
      <AppDrawer
            ref={aboutMeDrawerRef}
            title="What your story?"
            description="Tell us what your short story."
            snapPoints={['100%']}
            enableDynamicSizing={false}
            primaryAction={() => {
              aboutMeDrawerRef.current?.close();            }}
          >
            <FormField label="">
                <TextArea
                  placeholder="Tell us your story."
                  maxLength={750}
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
            snapPoints={['100%']}
            enableDynamicSizing={false}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
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
                    secureTextEntry
                    autoCapitalize="none"
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
      {/* Unsaved-changes confirmation (shown when leaving with edits pending) */}
      <ConfirmModal
        visible={discardVisible}
        title="Discard changes?"
        message="You have unsaved changes. If you leave now, your edits will be lost."
        primaryText="Keep Editing"
        secondaryText="Discard"
        onPrimary={() => setDiscardVisible(false)}
        onSecondary={discardChanges}
        onRequestClose={() => setDiscardVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
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
