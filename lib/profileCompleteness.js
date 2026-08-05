// Profile completeness gate: chatting and posting require a filled-out profile
// (everything except About Me; Personality and Lifestyle need at least one pick each).
import { router } from 'expo-router';

import { showConfirmModal } from '@/components/ui/confirmModalHost';

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

// App-styled gate (ConfirmModal via the global host) with a shortcut into Edit Profile.
export function showProfileGate({ missing, backTo } = {}) {
  showConfirmModal({
    title: 'Complete your profile first',
    message: 'A complete profile helps people trust you. Please fill in:',
    bullets: missing ?? [],
    primaryText: 'Complete Profile',
    secondaryText: 'Not Now',
    onPrimary: () =>
      router.push({
        pathname: '/(tabs)/account/editProfile',
        params: backTo ? { backTo } : undefined,
      }),
  });
}
