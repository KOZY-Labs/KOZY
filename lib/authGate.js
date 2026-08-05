// Auth-required gate for guest users, per the Flow1 mockups:
// title + message + [Sign Up | Log In | Close], shown in the app-styled modal.
import { router } from 'expo-router';

import { showConfirmModal } from '@/components/ui/confirmModalHost';

export function showAuthGate({ title, message, redirect } = {}) {
  const params = redirect ? { redirect } : undefined;
  showConfirmModal({
    title,
    message,
    primaryText: 'Sign Up',
    secondaryText: 'Log In',
    tertiaryText: 'Close',
    onPrimary: () => router.push({ pathname: '/(auth)/signUp/email', params }),
    onSecondary: () => router.push({ pathname: '/(auth)/login', params }),
  });
}
