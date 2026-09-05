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
  // `verified` is server-authoritative: the Persona webhook flips it in these caches
  // via the Admin SDK, and it can land while the caller still holds a stale profile
  // (races observed: whole-map writes here clobbered the webhook's update). Field-path
  // merges that never mention `verified` leave the webhook's value intact.
  const { verified: _serverOnly, ...owner } = ownerFromProfile(profile);

  const [listingSnap, chatSnap] = await Promise.all([
    getDocs(query(collection(db, 'listings'), where('ownerId', '==', uid))),
    getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', uid))),
  ]);

  const listingUpdate = Object.fromEntries(
    Object.entries(owner).map(([field, value]) => [`owner.${field}`, value])
  );
  const chatUpdate = Object.fromEntries(
    Object.entries(owner).map(([field, value]) => [`participantsInfo.${uid}.${field}`, value])
  );

  await Promise.all([
    ...listingSnap.docs.map((d) =>
      updateDoc(d.ref, { ...listingUpdate, updatedAt: serverTimestamp() })
    ),
    ...chatSnap.docs.map((d) =>
      updateDoc(d.ref, { ...chatUpdate, updatedAt: serverTimestamp() })
    ),
  ]);

  return profile;
}
