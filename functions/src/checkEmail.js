// Signup email step: "does an account already exist for this email?"
// The client can't answer this itself — with email-enumeration protection on,
// fetchSignInMethodsForEmail always returns [] — so the check runs here with the
// Admin SDK. Deliberately narrow: boolean only, no user data, invalid input → false.
//
// Unverified accounts are pending signups, not members (no data yet). One that was
// abandoned — older than STALE_UNVERIFIED_MS — is deleted here so the email can be
// used again. Younger ones are still reported as taken: the owner may be mid-
// verification, and a stranger typing that email must not be able to wipe it.
const { onCall } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { db } = require('./admin');

const REGION = 'us-central1';
const STALE_UNVERIFIED_MS = 10 * 60 * 1000;

const checkEmailInUse = onCall({ region: REGION }, async (request) => {
  const email = String(request.data?.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) return { inUse: false };
  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') return { inUse: false };
    throw e;
  }
  if (user.emailVerified) return { inUse: true };

  const createdAt = Date.parse(user.metadata?.creationTime ?? '') || 0;
  if (Date.now() - createdAt < STALE_UNVERIFIED_MS) return { inUse: true, pending: true };

  await db.doc(`users/${user.uid}`).delete().catch(() => {});
  await getAuth().deleteUser(user.uid);
  return { inUse: false };
});

module.exports = { checkEmailInUse };
