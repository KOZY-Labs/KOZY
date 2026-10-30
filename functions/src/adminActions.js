// Admin-only callables behind website/admin.html. The page hides the buttons from
// non-admins, but this server-side role check is the real gate.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { db, storage } = require('./admin');

const REGION = 'us-central1';

// Returns the caller's display name so actions can record who took them.
async function assertAdmin(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const me = (await db.doc(`users/${uid}`).get()).data();
  if (me?.role !== 'admin') throw new HttpsError('permission-denied', 'Admins only.');
  return me.displayName || request.auth.token?.email || 'Admin';
}

function requireId(value, name) {
  const id = String(value ?? '').trim();
  if (!id || id.includes('/')) throw new HttpsError('invalid-argument', `${name} is required.`);
  return id;
}

// Same steps as deleteListing in scripts/delete-test-users.js. Who deleted it is
// written before the delete so the tombstone trigger (listingTombstone.js) keeps it.
const adminDeleteListing = onCall({ region: REGION }, async (request) => {
  const adminName = await assertAdmin(request);
  const listingId = requireId(request.data?.listingId, 'listingId');
  const ref = db.doc(`listings/${listingId}`);
  if (!(await ref.get()).exists) throw new HttpsError('not-found', 'Listing already deleted.');

  await db.doc(`deletedListings/${listingId}`).set(
    { deletedBy: 'admin', deletedByUid: request.auth.uid, deletedByName: adminName },
    { merge: true }
  );
  await storage.bucket().deleteFiles({ prefix: `listings/${listingId}/`, force: true });
  try {
    const saved = await db.collectionGroup('savedListings').where('listingId', '==', listingId).get();
    await Promise.all(saved.docs.map((d) => d.ref.delete()));
  } catch (e) {
    // The saved list screen already tolerates a missing listing.
    logger.warn('adminDeleteListing: saved sweep failed', { listingId, error: e?.message });
  }
  await db.recursiveDelete(ref);
  return { ok: true };
});

// Disables sign-in, revokes sessions (the app signs out on its next token refresh,
// within an hour) and hides every published listing the user owns.
const adminSuspendUser = onCall({ region: REGION }, async (request) => {
  await assertAdmin(request);
  const uid = requireId(request.data?.uid, 'uid');
  if (uid === request.auth.uid) throw new HttpsError('failed-precondition', "You can't suspend yourself.");
  const target = await db.doc(`users/${uid}`).get();
  if (target.data()?.role === 'admin') throw new HttpsError('failed-precondition', "Admins can't be suspended.");

  try {
    await getAuth().updateUser(uid, { disabled: true });
    await getAuth().revokeRefreshTokens(uid);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') throw new HttpsError('not-found', 'This account no longer exists.');
    throw e;
  }

  const listings = await db
    .collection('listings')
    .where('ownerId', '==', uid)
    .where('status', '==', 'published')
    .get();
  const batch = db.batch();
  listings.docs.forEach((d) =>
    batch.update(d.ref, { status: 'archived', updatedAt: FieldValue.serverTimestamp() })
  );
  await batch.commit();
  return { ok: true, hiddenListings: listings.size };
});

module.exports = { adminDeleteListing, adminSuspendUser };
