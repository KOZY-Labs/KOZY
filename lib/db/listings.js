// listings collection — room/listing posts.
// Field shape mirrors data/mockListData.js (minus the inlined `owner`, normalized to ownerId).
import {
  collection,
  doc,
  getDoc,
  getDocs,
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
import { approximateCoordinate } from '@/lib/geo/approxLocation.mjs';

const COL = 'listings';

// Exact address + coordinates live in listings/{id}/private/location, readable by
// the owner only (firestore.rules). The public doc gets city/province and an
// approximate point (lib/geo/approxLocation.mjs) — never the real location.
const PRIVATE_FIELDS = ['street', 'additionalAddress', 'postalCode', 'latitude', 'longitude'];
const privateRef = (id) => doc(db, COL, id, 'private', 'location');

function splitListingData(id, data) {
  const pub = { ...data };
  const priv = {};
  for (const key of PRIVATE_FIELDS) {
    if (key in pub) {
      priv[key] = pub[key];
      delete pub[key];
    }
  }
  if ('latitude' in priv || 'longitude' in priv) {
    const approx = approximateCoordinate(priv.latitude, priv.longitude, id);
    pub.approxLatitude = approx?.latitude ?? null;
    pub.approxLongitude = approx?.longitude ?? null;
  }
  return { pub, priv };
}

async function writePrivate(id, priv) {
  if (Object.keys(priv).length === 0) return;
  await setDoc(privateRef(id), { ...priv, updatedAt: serverTimestamp() }, { merge: true });
}

// Owner-only read (rules reject everyone else) — used by the edit flow and the
// owner's own detail view.
export async function getListingPrivateLocation(id) {
  const snap = await getDoc(privateRef(id));
  return snap.exists() ? snap.data() : null;
}

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
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(mapSnap)),
    (e) => {
      // Terminal listener error: keep the last value, name the listener in the log.
      console.warn('[firestore] my listings listener:', e?.code ?? e?.message ?? e);
    }
  );
}

// Create. Pass status: 'draft' for the multi-step post flow, 'published' on confirm.
// The id is minted up front so the approximate point can be seeded with it.
export function createListing(data) {
  return createListingWithId(doc(collection(db, COL)).id, data);
}

// Create with a known id (useful when uploading media to listings/{id}/... first).
// Public doc first — the private doc's rule checks the parent's ownerId.
export async function createListingWithId(id, data) {
  const { pub, priv } = splitListingData(id, data);
  await setDoc(doc(db, COL, id), {
    ...pub,
    status: pub.status ?? 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await writePrivate(id, priv);
  return id;
}

export async function updateListing(id, data) {
  const { pub, priv } = splitListingData(id, data);
  await updateDoc(doc(db, COL, id), { ...pub, updatedAt: serverTimestamp() });
  await writePrivate(id, priv);
}

export function publishListing(id) {
  return updateListing(id, { status: 'published', publishedDate: new Date().toISOString() });
}

export async function deleteListing(id) {
  // Private doc first: once the parent is gone its rule can no longer resolve ownerId.
  await deleteDoc(privateRef(id));
  await deleteDoc(doc(db, COL, id));
}
