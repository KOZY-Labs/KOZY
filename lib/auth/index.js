// Auth helpers for KOZY. Thin wrappers over Firebase Auth + the users collection.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { ref as storageRef, listAll, deleteObject } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, storage } from '@/lib/firebase';
import { createUserDoc, getUserDoc, updateUserDoc, deleteUserDoc } from '@/lib/db/users';
import { listMyListings, deleteListing } from '@/lib/db/listings';
import { markUserDeletedInChats } from '@/lib/db/chats';

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

// Permanently delete the account (App Store requirement). Reauthenticates with the
// password first — Firebase requires a recent login for account deletion — then purges
// the user's data while still authenticated, and deletes the Auth user last.
export async function deleteAccount(password) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('No authenticated user');

  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password)
  );

  const uid = user.uid;

  // Delete own listings (all statuses). Chats are kept for the other participant —
  // this user is just marked as deleted in them (default avatar, input disabled).
  const listings = await listMyListings(uid);
  await Promise.all([
    ...listings.map((l) => deleteListing(l.id)),
    markUserDeletedInChats(uid),
  ]);

  // Best-effort cleanup of uploaded avatar files and local saved list; neither
  // should block the deletion if it fails.
  try {
    const avatarDir = await listAll(storageRef(storage, `users/${uid}/avatar`));
    await Promise.all(avatarDir.items.map((item) => deleteObject(item)));
  } catch {
    // noop
  }
  try {
    await AsyncStorage.removeItem('savedListings');
  } catch {
    // noop
  }

  await deleteUserDoc(uid);
  await deleteUser(user);
}

// Change the sign-in email. Reauthenticates first (Firebase requires a recent login),
// then sends a verification link to the NEW address — the email only switches after
// the user clicks it. The users doc is synced on the next auth refresh (subscribeToAuth).
export async function requestEmailChange(newEmail, password) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('No authenticated user');
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password)
  );
  await verifyBeforeUpdateEmail(user, newEmail);
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
      // Heal the denormalized email after a verified email change.
      if (profile && user.email && profile.email !== user.email) {
        await updateUserDoc(user.uid, { email: user.email });
        profile = { ...profile, email: user.email };
      }
    } catch {
      profile = null;
    }
    callback({ user, profile });
  });
}

export { auth };
