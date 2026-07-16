// Auth helpers for KOZY. Thin wrappers over Firebase Auth + the users collection.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserDoc, getUserDoc } from '@/lib/db/users';

// Build a `users/{uid}` document from the SignupContext shape.
// signup = { email, password, profile: { firstName, lastName, dob } }
export async function signUpWithEmail({ email, password, profile = {} }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = cred;

  const firstName = profile.firstName ?? '';
  const lastName = profile.lastName ?? '';
  const name = `${firstName} ${lastName}`.trim();

  if (name) {
    await updateProfile(user, { displayName: name });
  }

  await createUserDoc(user.uid, {
    uid: user.uid,
    email,
    firstName,
    lastName,
    name,
    nickname: firstName, // public display name; editable in Edit Profile
    dob: profile.dob ?? '',
    avatar: [],
    gender: '',
    ageGroup: '',
    occupation: '',
    personality: [],
    lifestyle: [],
    aboutMe: '',
    verified: false,
    role: 'user',
    trustLevel: 0,
  });

  // Fire-and-forget email verification; don't block signup completion on it.
  sendEmailVerification(user).catch(() => {});

  return user;
}

export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function requestPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error('No authenticated user');
  return sendEmailVerification(auth.currentUser);
}

// Reload the current user from the server (picks up emailVerified after the link is clicked).
export async function reloadUser() {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

export function isEmailVerified() {
  return !!auth.currentUser?.emailVerified;
}

export function currentUid() {
  return auth.currentUser?.uid ?? null;
}

// Subscribe to auth state. Returns the unsubscribe fn.
// Callback receives { user, profile } where profile is the users/{uid} doc (or null).
export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, profile: null });
      return;
    }
    let profile = null;
    try {
      profile = await getUserDoc(user.uid);
    } catch {
      profile = null;
    }
    callback({ user, profile });
  });
}

export { auth };
