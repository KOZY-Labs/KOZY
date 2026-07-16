// Auth-required gate modal for guest users, per the Flow1 mockups:
// title + message + [Sign Up | Log In | Close].
import { Alert } from 'react-native';
import { router } from 'expo-router';

export function showAuthGate({ title, message, redirect } = {}) {
  const params = redirect ? { redirect } : undefined;
  Alert.alert(title, message, [
    {
      text: 'Sign Up',
      onPress: () => router.push({ pathname: '/(auth)/signUp/email', params }),
    },
    {
      text: 'Log In',
      onPress: () => router.push({ pathname: '/(auth)/login', params }),
    },
    { text: 'Close', style: 'cancel' },
  ]);
}
