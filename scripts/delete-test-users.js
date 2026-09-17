#!/usr/bin/env node
/* global __dirname */
// Wipe test accounts end to end (no admin panel — this script is the admin panel).
//
// For each uid: own listings (+ Storage files, + other users' saved entries),
// every chat the user is in (messages + chat media — deleted outright, the other
// side is a tester too), reports they filed, users/{uid} (+ savedListings,
// avatar files) and finally the Auth user.
//
// Usage (dry run prints the plan, nothing is deleted until --yes):
//   node scripts/delete-test-users.js <uid> [<uid>...]
//   node scripts/delete-test-users.js --yes <uid> [<uid>...]
//   node scripts/delete-test-users.js --yes --keep-chats <uid>   # mark "Deleted User" instead of deleting chats
//
// Auth: GOOGLE_APPLICATION_CREDENTIALS=<serviceAccount.json> (gitignored) or
//       `gcloud auth application-default login`. Project id from .env.local.
const fs = require('fs');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const keepChats = args.includes('--keep-chats');
const uids = args.filter((a) => !a.startsWith('--'));
if (!uids.length) {
  console.error('Usage: node scripts/delete-test-users.js [--yes] [--keep-chats] <uid> [<uid>...]');
  process.exit(1);
}

function readProjectId() {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  const m = env.match(/^EXPO_PUBLIC_FIREBASE_PROJECT_ID=(.+)$/m);
  if (!m) throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID missing in .env.local');
  return m[1].trim();
}
function readBucket() {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  const m = env.match(/^EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=(.+)$/m);
  return m ? m[1].trim() : undefined;
}

const projectId = readProjectId();
initializeApp({ credential: applicationDefault(), projectId, storageBucket: readBucket() });
const db = getFirestore();
const bucket = getStorage().bucket();
const auth = getAuth();

const act = (label, fn) => (yes ? fn() : (console.log(`  [dry] ${label}`), Promise.resolve()));

async function deleteStoragePrefix(prefix) {
  await act(`storage rm -r ${prefix}`, () => bucket.deleteFiles({ prefix, force: true }));
}

async function deleteListing(listingId) {
  console.log(`  listing ${listingId}`);
  await deleteStoragePrefix(`listings/${listingId}/`);
  // Other users' saved entries pointing at this listing. Needs the collection-group
  // index on savedListings.listingId; if it's missing, warn and move on (the saved
  // list screen already tolerates a missing listing).
  try {
    const saved = await db.collectionGroup('savedListings').where('listingId', '==', listingId).get();
    for (const d of saved.docs) await act(`rm ${d.ref.path}`, () => d.ref.delete());
  } catch (e) {
    console.warn(`  ! could not sweep saved entries for ${listingId}: ${e.message}`);
  }
  await act(`rm listings/${listingId}`, () => db.doc(`listings/${listingId}`).delete());
}

async function deleteChat(chatId) {
  console.log(`  chat ${chatId} (delete)`);
  await deleteStoragePrefix(`chats/${chatId}/media/`);
  await act(`rm -r chats/${chatId}`, () => db.recursiveDelete(db.doc(`chats/${chatId}`)));
}

async function markDeletedInChat(chatId, uid) {
  console.log(`  chat ${chatId} (mark deleted)`);
  await act(`update chats/${chatId} participantsInfo.${uid}`, () =>
    db.doc(`chats/${chatId}`).update({
      [`participantsInfo.${uid}`]: { name: 'Deleted User', avatar: [], deleted: true },
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
}

async function wipeUser(uid) {
  console.log(`\n== ${uid}`);
  const userSnap = await db.doc(`users/${uid}`).get();
  let authUser = null;
  try {
    authUser = await auth.getUser(uid);
  } catch {
    // not in Auth (already deleted or never signed up)
  }
  console.log(`  users doc: ${userSnap.exists ? userSnap.get('email') ?? '(no email)' : 'missing'} | auth: ${authUser?.email ?? 'missing'}`);

  const listings = await db.collection('listings').where('ownerId', '==', uid).get();
  for (const d of listings.docs) await deleteListing(d.id);

  const chats = await db.collection('chats').where('participants', 'array-contains', uid).get();
  for (const d of chats.docs) {
    if (keepChats) await markDeletedInChat(d.id, uid);
    else await deleteChat(d.id);
  }

  const reports = await db.collection('reports').where('reporterId', '==', uid).get();
  for (const d of reports.docs) await act(`rm reports/${d.id}`, () => d.ref.delete());

  await deleteStoragePrefix(`users/${uid}/`);
  if (userSnap.exists) {
    await act(`rm -r users/${uid}`, () => db.recursiveDelete(userSnap.ref));
  }
  if (authUser) await act(`auth deleteUser ${uid}`, () => auth.deleteUser(uid));

  console.log(
    `  summary: ${listings.size} listings, ${chats.size} chats, ${reports.size} reports` +
      `${userSnap.exists ? ', users doc' : ''}${authUser ? ', auth user' : ''}`
  );
}

(async () => {
  console.log(`${yes ? 'DELETING' : 'DRY RUN'} on project ${projectId} — ${uids.length} uid(s)`);
  for (const uid of uids) await wipeUser(uid);
  if (!yes) console.log('\nNothing deleted. Re-run with --yes to apply.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
