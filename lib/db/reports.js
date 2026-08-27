// reports — see [COLLECTIONS] in CLAUDE.md. Contact/report submissions, triaged by admins.
// firestore.rules: signed-in users may create their own (reporterId == auth.uid);
// read/update/delete is admin-only.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
