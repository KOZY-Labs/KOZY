// Records every listing deletion (owner in the app, admin page, or scripts) so the
// admin page can say when a reported listing disappeared and who removed it.
const { onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { db } = require('./admin');

const REGION = 'us-central1';

const recordDeletedListing = onDocumentDeleted(
  { document: 'listings/{listingId}', region: REGION },
  async (event) => {
    const listing = event.data?.data() ?? {};
    const ref = db.doc(`deletedListings/${event.params.listingId}`);
    // adminDeleteListing pre-writes who deleted it; anything else is the owner.
    // Names are snapshots so they survive the account being deleted later.
    const byAdmin = (await ref.get()).data()?.deletedBy === 'admin';
    const ownerName = !byAdmin && listing.ownerId
      ? (await db.doc(`users/${listing.ownerId}`).get()).data()?.displayName ?? null
      : null;
    await ref.set(
      {
        deletedAt: new Date(event.time),
        title: listing.title ?? null,
        ownerId: listing.ownerId ?? null,
        ...(byAdmin
          ? {}
          : { deletedBy: 'owner', deletedByUid: listing.ownerId ?? null, deletedByName: ownerName }),
      },
      { merge: true }
    );
  }
);

module.exports = { recordDeletedListing };
