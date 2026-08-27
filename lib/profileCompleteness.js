// Profile completeness gate: chatting and posting require a filled-out profile
// (everything except About Me; Personality and Lifestyle need at least one pick each).
// The pure completeness/level rules live in lib/trustLevel.mjs (Node-loadable, shared
// with the migration script); this module adds the app-side gate UI on top.
import { router } from 'expo-router';

import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import { getMissingProfileFields } from '@/lib/trustLevel.mjs';

export { getMissingProfileFields, isProfileComplete } from '@/lib/trustLevel.mjs';

// One-call gate for flows that need a complete profile (chat request, posting).
// Returns true when the flow may proceed. Handles BOTH states a caller could hit:
// profile not yet delivered (brief users-doc subscription window — never treat as
// "all fields missing") and a loaded-but-incomplete profile.
export function gateProfileComplete(profile, { backTo } = {}) {
  if (!profile) {
    showAlertModal({
      title: 'Just a moment',
      message: 'Your profile is still loading. Please try again in a few seconds.',
    });
    return false;
  }
  const missing = getMissingProfileFields(profile);
  if (missing.length) {
    showProfileGate({ missing, backTo });
    return false;
  }
  return true;
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
