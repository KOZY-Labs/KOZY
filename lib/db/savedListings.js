// users/{uid}/savedListings/{listingId} — saved listings live in Firestore (doc id ==
// listingId, so saves are idempotent). The subcollection onSnapshot applies local
// writes instantly (latency compensation), so the heart flips with no optimistic
// machinery, and the list syncs across devices for free.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const sub = (uid) => collection(db, 'users', uid, 'savedListings');
const savedRef = (uid, listingId) => doc(db, 'users', uid, 'savedListings', listingId);

export async function saveListing(uid, listingId) {
  await setDoc(savedRef(uid, listingId), {
    listingId,
    savedAt: serverTimestamp(),
  });
}

export async function unsaveListing(uid, listingId) {
  await deleteDoc(savedRef(uid, listingId));
}

// Resolves to whether the listing is saved AFTER the toggle.
export async function toggleSavedListing(uid, listingId) {
  const existing = await getDoc(savedRef(uid, listingId));
  if (existing.exists()) {
    await unsaveListing(uid, listingId);
    return false;
  }
  await saveListing(uid, listingId);
  return true;
}

// Live id list, newest data straight from the subcollection. Returns the unsubscribe fn.
export function subscribeSavedListingIds(uid, callback) {
  return onSnapshot(
    sub(uid),
    (snap) => callback(snap.docs.map((d) => d.id)),
    () => {
      // Terminal listener error: keep whatever the caller already has.
    }
  );
}

export async function listSavedListingIds(uid) {
  const snap = await getDocs(sub(uid));
  return snap.docs.map((d) => d.id);
}

// Account deletion: purge the subcollection (Firestore doesn't cascade-delete).
export async function purgeSavedListings(uid) {
  const snap = await getDocs(sub(uid));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

