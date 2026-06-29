// listings collection — room/listing posts.
// Field shape mirrors data/mockListData.js (minus the inlined `owner`, normalized to ownerId).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COL = 'listings';

function mapSnap(snap) {
  return { id: snap.id, ...snap.data() };
}

export async function getListing(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return mapSnap(snap);
}

// Feed / browse. opts: { max, ownerId, status }
export async function listListings({ max = 50, ownerId, status = 'published' } = {}) {
  const clauses = [];
  if (status) clauses.push(where('status', '==', status));
  if (ownerId) clauses.push(where('ownerId', '==', ownerId));
  clauses.push(orderBy('createdAt', 'desc'));
  if (max) clauses.push(fbLimit(max));

  const q = query(collection(db, COL), ...clauses);
  const snap = await getDocs(q);
  return snap.docs.map(mapSnap);
}

export function listMyListings(ownerId, opts = {}) {
  return listListings({ ...opts, ownerId, status: null });
}

// Real-time subscription to a user's listings (all statuses). Auto-updates when a
// just-published doc's serverTimestamp resolves, avoiding the "missing right after
// publish" gap a one-shot getDocs would have. Returns the unsubscribe fn.
export function subscribeMyListings(ownerId, callback) {
  const q = query(
    collection(db, COL),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapSnap)));
}

// Create. Pass status: 'draft' for the multi-step post flow, 'published' on confirm.
export async function createListing(data) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: data.status ?? 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// Create with a known id (useful when uploading media to listings/{id}/... first).
export async function createListingWithId(id, data) {
  await setDoc(doc(db, COL, id), {
    ...data,
    status: data.status ?? 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function updateListing(id, data) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export function publishListing(id) {
  return updateListing(id, { status: 'published', publishedDate: new Date().toISOString() });
}

export async function deleteListing(id) {
  await deleteDoc(doc(db, COL, id));
}
