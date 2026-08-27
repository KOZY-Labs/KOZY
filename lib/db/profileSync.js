// Denormalization sync: listings carry an `owner` display cache and chats carry
// `participantsInfo`, both copied from the user profile at write time. After a profile
// change, push the fresh profile into every copy so other users never see stale info.
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserDoc } from '@/lib/db/users';
import { ownerFromProfile } from '@/lib/listingDraft';

// Accepts an optional preloaded profile so a caller that just wrote the doc (and holds
// the merged values) skips a redundant read. Returns the profile used.
export async function syncProfileCaches(uid, preloaded) {
  const profile = preloaded ?? (await getUserDoc(uid));
  if (!profile) return null;
  const owner = ownerFromProfile(profile);

  const [listingSnap, chatSnap] = await Promise.all([
    getDocs(query(collection(db, 'listings'), where('ownerId', '==', uid))),
    getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', uid))),
  ]);

  await Promise.all([
    ...listingSnap.docs.map((d) =>
      updateDoc(d.ref, { owner, updatedAt: serverTimestamp() })
    ),
    ...chatSnap.docs.map((d) =>
      updateDoc(d.ref, {
        [`participantsInfo.${uid}`]: owner,
        updatedAt: serverTimestamp(),
      })
    ),
  ]);

  return profile;
}
