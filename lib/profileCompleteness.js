// Profile completeness gate: chatting and posting require a filled-out profile
// (everything except About Me; Personality and Lifestyle need at least one pick each).
import { Alert } from 'react-native';
import { router } from 'expo-router';

export function getMissingProfileFields(profile) {
  const missing = [];
  if (!(profile?.avatar?.length)) missing.push('Profile photo');
  if (!profile?.nickname?.trim?.() && !profile?.firstName) missing.push('Nickname');
  if (!profile?.gender) missing.push('Gender');
  if (!profile?.occupation) missing.push('Job or Profession');
  if (!(profile?.personality?.length)) missing.push('Personality (pick at least one)');
  if (!(profile?.lifestyle?.length)) missing.push('Lifestyle (pick at least one)');
  return missing;
}

export function isProfileComplete(profile) {
  return getMissingProfileFields(profile).length === 0;
}

// Same UX pattern as showAuthGate: alert with a shortcut into Edit Profile.
export function showProfileGate({ missing, backTo } = {}) {
  const items = (missing ?? []).map((label) => `• ${label}`).join('\n');
  Alert.alert(
    'Complete your profile first',
    `A complete profile helps people trust you. Please fill in:\n\n${items}`,
    [
      {
        text: 'Complete Profile',
        onPress: () =>
          router.push({
            pathname: '/(tabs)/account/editProfile',
            params: backTo ? { backTo } : undefined,
          }),
      },
      { text: 'Not Now', style: 'cancel' },
    ]
  );
}
