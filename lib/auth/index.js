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
  updatePassword,
} from 'firebase/auth';
import { deleteField } from 'firebase/firestore';
import { ref as storageRef, listAll, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, storage, functions } from '@/lib/firebase';
import { createUserDoc, getUserDoc, updateUserDoc, deleteUserDoc } from '@/lib/db/users';
import { listMyListings, deleteListing } from '@/lib/db/listings';
import { markUserDeletedInChats } from '@/lib/db/chats';
import { purgeSavedListings } from '@/lib/db/savedListings';

// An account that never verified its email is a pending signup, not a member —
// it holds no data yet. Discard it (users doc + Auth user) so the flow can be
// restarted: going back from the verify screen to fix the email, or re-running
// the profile step, must not collide with the copy we created moments ago.
// Fresh accounts are within Firebase's "recent login" window, so deleteUser works.
export async function discardPendingSignup() {
  const user = auth.currentUser;
  if (!user || user.emailVerified) return false;
  try {
    await deleteUserDoc(user.uid);
  } catch {
    // Doc may not exist yet (createUserDoc never landed) — the Auth user is what matters.
  }
  await deleteUser(user);
  return true;
}

// Build a `users/{uid}` document from the SignupContext shape.
// signup = { email, password, profile: { firstName, lastName, dob } }
export async function signUpWithEmail({ email, password, profile = {} }) {
  await discardPendingSignup();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = cred;

  // Trimmed here as the last line of defense: a whitespace-only name that slips into
  // the doc becomes uneditable once verification locks identity fields.
  const firstName = (profile.firstName ?? '').trim();
  const lastName = (profile.lastName ?? '').trim();
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
    dob: profile.dob ?? '',
    avatar: [],
    gender: '',
    ageGroup: '',
    occupation: '',
    personality: [],
    lifestyle: [],
    aboutMe: '',
    verified: false, // Persona identity verification only (email verification lives on Auth)
    role: 'user',
    trustLevel: 1, // Member — see lib/trustLevel.mjs
  });

  // Send the verification link before returning so failures are visible (a swallowed
  // rejection here looked like "the email was never sent"). Still non-fatal: the verify
  // screen has a Resend button, so signup itself must not fail on a send hiccup.
  try {
    await sendEmailVerification(user);
  } catch (e) {
    console.warn('[auth] sendEmailVerification failed:', e?.code ?? e?.message ?? e);
  }

  return user;
}

// Early "account already exists?" check for the signup email step. Goes through
// the checkEmailInUse callable: with email-enumeration protection on (default),
// the client-side fetchSignInMethodsForEmail always returned [] and the duplicate
// only surfaced at the very last step (createUser → auth/email-already-in-use).
export async function isEmailInUse(email) {
  // Coming back from the verify screen: the pending account we just created must
  // not report its own email as taken.
  await discardPendingSignup();
  const check = httpsCallable(functions, 'checkEmailInUse');
  const { data } = await check({ email });
  // `pending`: an unverified account was created within the last few minutes —
  // most likely this very user mid-verification on another device/session.
  return { inUse: !!data?.inUse, pending: !!data?.pending };
}

export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  // Clear the push token BEFORE signing out (rules only let the signed-in user
  // write their own doc). Best-effort: a failed cleanup must not block logout —
  // a stale token is also self-healed server-side via DeviceNotRegistered.
  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      await updateUserDoc(uid, { fcmToken: deleteField() });
    } catch (e) {
      console.warn('[auth] push token cleanup failed:', e?.code ?? e?.message ?? e);
    }
  }
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
    await purgeSavedListings(uid);
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

// Firebase requires a recent login to change a password, so reauthenticate with
// the current password first (same pattern as deleteAccount).
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, currentPassword)
  );
  await updatePassword(user, newPassword);
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
