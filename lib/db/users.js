// users collection — doc id is the Firebase Auth uid.
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COL = 'users';

export async function createUserDoc(uid, data) {
  await setDoc(
    doc(db, COL, uid),
    { ...data, uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true }
  );
  return uid;
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, COL, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, COL, uid), { ...data, updatedAt: serverTimestamp() });
}

// Screen tracking (analytics + manual placement). Written on every route change,
// so it deliberately does NOT bump updatedAt. setDoc+merge tolerates a missing doc.
export async function trackLastScreen(uid, path) {
  await setDoc(
    doc(db, COL, uid),
    { lastScreenVisited: path, lastScreenVisitedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteUserDoc(uid) {
  await deleteDoc(doc(db, COL, uid));
}
