// Map Firebase Auth error codes to user-friendly messages.
const MESSAGES = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/missing-password': 'Please enter your password.',
};

export function authErrorMessage(error) {
  const code = error?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  return error?.message || 'Something went wrong. Please try again.';
}
