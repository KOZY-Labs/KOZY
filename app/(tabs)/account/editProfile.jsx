import { useRef, useState, useCallback } from 'react';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Platform, StyleSheet, View, Dimensions, FlatList, Alert } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import MediaInput from '@/components/ui/input/mediaInput';
import validateImage from '@/utils/mediaValidation';
import { useAuth } from '@/context/AuthContext';
import { updateUserDoc } from '@/lib/db/users';
import { uploadUserAvatar } from '@/lib/utils/uploadMedia';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.8;
const ITEM_SPACING = 12;


export default function EditProfile() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { ownerId } = useLocalSearchParams();
    const normalizedOwnerId = Array.isArray(ownerId) ? ownerId[0] : ownerId;
    const { profile, uid, refreshProfile } = useAuth();
    const existingAvatar = profile?.avatar ?? [];
    const genderDrawerRef = useRef(null);
    const personalityDrawerRef = useRef(null);
    const jobDrawerRef = useRef(null);
    const lifestyleDrawerRef = useRef(null);
    const aboutMeDrawerRef = useRef(null);
    const myVerificationDrawerRef = useRef(null);
    const verificationConfirmDrawerRef = useRef(null);
    const emailEditDrawerRef = useRef(null);
    const emailCheckDrawerRef = useRef(null);
    const photoDrawerRef = useRef(null);
    const [personality, setPersonality] = useState(profile?.personality ?? []);
    const [lifestylePreferences, setLifestylePreferences] = useState(profile?.lifestyle ?? []);
    const [gender, setGender] = useState(profile?.gender ?? null);
    const [job, setJob] = useState(profile?.occupation ?? null);
    const [aboutMe, setAboutMe] = useState(profile?.aboutMe ?? '');
    const [error, setError] = useState(null);
    const [myEmail, setMyEmail] = useState(profile?.email ?? null);
    const [verified, setVerified] = useState(profile?.verified ?? false);
    const [photos, setPhotos] = useState([]);
    const [photoError, setPhotoError] = useState(null);
    const [saving, setSaving] = useState(false);

    useFocusEffect(
      useCallback(() => {
        const parent = navigation.getParent();
        parent?.setOptions({
          tabBarStyle: { display: 'none' },
        });

        return () => {
          parent?.setOptions({
            tabBarStyle: { 
              display: 'flex',
              position: 'absolute',
              alignSelf: 'center', 
              bottom: insets.bottom + 10,
              borderRadius: 16,
              borderTopWidth: 0,
              height: 56,
              backgroundColor: 'rgba(0,0,0,1)',
              maxWidth: 400,
              paddingTop: 7,
              marginHorizontal: 16,
            },
          });
        };
      }, [navigation, insets])
    );

  const saveProfile = async () => {
    if (!uid) {
      Alert.alert('Sign in required', 'Please log in again to update your profile.');
      return;
    }
    setSaving(true);
    try {
      // Upload any newly picked profile photos to Storage; otherwise keep existing avatar.
      const newAvatarUrls = photos.length
        ? await Promise.all(photos.map((p) => uploadUserAvatar(uid, p)))
        : [];
      const avatar = newAvatarUrls.length ? newAvatarUrls : existingAvatar;

      await updateUserDoc(uid, {
        gender: gender ?? '',
        occupation: job ?? '',
        personality,
        lifestyle: lifestylePreferences,
        aboutMe,
        avatar,
        verified,
      });
      await refreshProfile();
      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Update failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addPhoto = async () => {
    if (photos.length >= 2) {
      setPhotoError('You can upload up to 2 profile photos.');
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
        selectionLimit: 2 - photos.length,
        quality: 1,
      });

      if (result.canceled) return;

      const invalid = result.assets.find((asset) => validateImage(asset));
      if (invalid) {
        setPhotoError(validateImage(invalid));
        return;
      }

      setPhotos((prev) => [...prev, ...result.assets].slice(0, 2));
      setPhotoError(null);
    } catch {
      Alert.alert('Unable to open gallery', 'Please try selecting your photos again.');
    }
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
              {/* Image carousel */}
              <FlatList
                data={photos.length ? photos.map((p) => p.uri) : existingAvatar}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                decelerationRate="fast"
                keyExtractor={(uri, index) => `${uri}-${index}`}
                contentContainerStyle={{
                  paddingVertical: 20,
                }}
                ListEmptyComponent={(
                  <View style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}>
                    <View style={[styles.image, { backgroundColor: colors.semantic.bg.grey }]} />
                  </View>
                )}
                renderItem={({ item: image, index }) => {
                  const total = photos.length ? photos.length : existingAvatar.length;
                  const isLastItem = index === total - 1;

                  return (
                    <View style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}>
                      <Image
                        source={{ uri: image }}
                        style={[styles.image, isLastItem && { marginRight: 0 }]}
                        contentFit="cover"
                      />
                    </View>
                  );
                }}
              />
              <View style={styles.uploadButtonContainer}>
                <AppButton 
                  text="Upload" 
                  onPress={() => photoDrawerRef.current?.snapToIndex(0)} 
                  type="primary" 
                  size='sm'
                />
              </View>
            </View>
            {/* Help Text */}
            <DisplayField title="My Profile" style={{ marginBottom: 16 }}>
              Keeping your ID, photo, and profile details up to date helps us build trust in the KOZY community.
            </DisplayField>

            {/* Inputs */}
            <FormField label="Gender" error={error}>
              <DisplayInput
                value={gender}
                placeholder="Select an option"
                onPress={() => genderDrawerRef.current?.snapToIndex(0)}
                rightIcon={<Feather name="chevron-down" size={22} color={colors.semantic.text.primary} />}
                accessibilityLabel="Gender Preference filter"
              />
            </FormField>
            <FormField label="Job or Profession" error={error}>
              <DisplayInput
                value={job}
                placeholder="Enter your job or profession"
                onPress={() => jobDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
            <FormField label="Personality" error={error}>
              <DisplayInput
                value={personality}
                isMulti={true}
                max={3}
                placeholder="+"
                onPress={() => personalityDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
            <FormField label="Lifestyle" error={error}>
              <DisplayInput
                value={lifestylePreferences}
                isMulti={true}
                max={3}
                placeholder="+"
                onPress={() => lifestyleDrawerRef.current?.snapToIndex(0)}
              />
            </FormField>
            <View style={styles.idVerificationContainer}>
              <AppText variant="body-sm-strong" color="primary">
                ID Verification
              </AppText>
              <View style={{ width: 92 }}>
                <AppButton 
                  text="Verify"
                  size="sm"
                  type='primary'
                  onPress={() => myVerificationDrawerRef.current?.snapToIndex(0)}
                />
              </View>
            </View>
            <View style={styles.emailContainer}>
              <FormField label="My Email" error={error} style={styles.emailField}>
                <DisplayInput
                  value={myEmail}
                  onChangeText={setMyEmail}
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
            primaryAction={() => {
              jobDrawerRef.current?.close();             }}
          >
            <FormField label="" error={error}>
              <InputRow>
                <TextField placeholder="ex: Software Engineer" error={!!error} value={job} onChangeText={setJob}/>
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
            primaryAction={() => {
              aboutMeDrawerRef.current?.close();            }}
          >
            <FormField label="" error={error}>
                <TextArea 
                  placeholder="Tell us your story." 
                  error={!!error} 
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
            primaryAction={async () => {
              myVerificationDrawerRef.current?.close();
            
              const result = await startPersonaVerification(normalizedOwnerId ?? 'kozy-test-user');
            
              if (result.type === 'success') {
                setVerified(true);
                verificationConfirmDrawerRef.current?.snapToIndex(0);
              }
            }}
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
            description="Enter Your School or Work Email"
            primaryActionText="Send Verification Code"
            primaryAction={() => {
              emailEditDrawerRef.current?.close()
              emailCheckDrawerRef.current?.snapToIndex(0)
            }}
          >
            <View>
              <AppText variant='body-xsm'>
                ✶ We’ll send a verification code to confirm your email.
              </AppText>
              <AppText variant='body-xsm'>
              ✶ For secure matching, please use your school or work email address.
              </AppText>
            </View>
            <View style={{ marginTop: 54 }}>
              <FormField label="" error={error}>
                  <TextField placeholder="youremail@gmail.com" error={!!error} type="auth"/>
              </FormField>
            </View>
      </AppDrawer>
      <AppDrawer
            ref={emailCheckDrawerRef}
            title="Update email address"
            align="center"
            description="We’ve sent a 6-digit code to your email. Enter the code to verify your email address."
            primaryActionText="Verify"
            secondaryActionText="Resend Code"
            primaryAction={() => {
              emailCheckDrawerRef.current?.close()
            }}
            secondaryAction={() => {
              emailCheckDrawerRef.current?.close()
            }}
          >
            
          <FormField label="" error={error}>
              <TextField placeholder="youremail@gmail.com" error={!!error} type="auth"/>
          </FormField>
      </AppDrawer>
      <AppDrawer
            ref={photoDrawerRef}
            title="Upload Profile Pictures"
            align="center"
            description="Upload 2 clear face photos to build trust and increase your match chances."
            primaryActionText="Save"
            primaryDisabled={photos.length === 0}
            primaryAction={() => {
              photoDrawerRef.current?.close();
            }}
          >
          <FormField label="" error={photoError}>
            <MediaInput 
              error={!!photoError}
              onPress={addPhoto}
              photos={photos.map(p => p.uri)}
            />
          </FormField>
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
  uploadButtonContainer:{
    position: 'absolute',
    bottom: 28,
    right: 12,
  }
});
