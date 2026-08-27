// reports — see [COLLECTIONS] in CLAUDE.md. Contact/report submissions, triaged by admins.
// firestore.rules: signed-in users may create their own (reporterId == auth.uid) and
// read their own; update/delete is admin-only.
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function createReport({
  targetType, // 'listing' | 'user' | 'general'
  targetId = null,
  reporterId,
  name,
  email,
  message,
}) {
  await addDoc(collection(db, 'reports'), {
    targetType,
    targetId,
    reporterId,
    name,
    email,
    reason: message,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Live listingIds the user has reported, so the browse feed can hide them from the
// reporter. Single equality filter only — targetType is narrowed client-side to keep
// the query on Firestore's automatic single-field index. Returns the unsubscribe fn.
export function subscribeReportedListingIds(uid, callback) {
  const q = query(collection(db, 'reports'), where('reporterId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const ids = snap.docs
        .map((d) => d.data())
        .filter((r) => r.targetType === 'listing' && r.targetId)
        .map((r) => r.targetId);
      callback([...new Set(ids)]);
    },
    () => {
      // Terminal listener error: keep whatever the caller already has.
    }
  );
}
