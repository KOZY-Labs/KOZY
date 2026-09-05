// Persona webhook — tamper-proof identity verification.
// The client's redirect-parsed status (services/personaVerification.js) is a UX
// convenience only; this endpoint is the source of truth for users.verified.
// Register the deployed URL in Persona Dashboard → Webhooks, and store the
// webhook secret with: firebase functions:secrets:set PERSONA_WEBHOOK_SECRET
const crypto = require('node:crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('./admin');

const PERSONA_WEBHOOK_SECRET = defineSecret('PERSONA_WEBHOOK_SECRET');
// Which Persona environment this deployment's webhook/secret belongs to — stamped
// into users.persona.environment so sandbox-verified test users are identifiable
// (and resettable) before going live. Set in functions/.env; flip to 'production'
// together with the production webhook secret (see docs/TODO.md launch checklist).
const PERSONA_ENVIRONMENT = defineString('PERSONA_ENVIRONMENT', { default: 'sandbox' });

// Persona-Signature: "t=<unix>,v1=<hex>[,v1=<hex>...]" — HMAC-SHA256 of "<t>.<rawBody>".
// Multiple v1 entries appear during secret rotation; any single match passes.
function verifySignature(header, rawBody, secret) {
  if (!header || !rawBody || !secret) return false;
  const parts = header.split(',').map((p) => p.trim());
  const t = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || !signatures.length) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${rawBody}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

// Mirror of the client's lib/ownerCache.mjs denormalization: listings carry an
// `owner` cache and chats a `participantsInfo.{uid}` cache — flip their verified
// flag so other users see the badge without waiting for the next profile save.
async function syncVerifiedCaches(uid) {
  const [listingSnap, chatSnap] = await Promise.all([
    db.collection('listings').where('ownerId', '==', uid).get(),
    db.collection('chats').where('participants', 'array-contains', uid).get(),
  ]);
  await Promise.all([
    ...listingSnap.docs.map((d) =>
      d.ref.update({ 'owner.verified': true, updatedAt: FieldValue.serverTimestamp() })
    ),
    ...chatSnap.docs.map((d) =>
      d.ref.update({
        [`participantsInfo.${uid}.verified`]: true,
        updatedAt: FieldValue.serverTimestamp(),
      })
    ),
  ]);
}

const personaWebhook = onRequest(
  { region: 'us-east1', secrets: [PERSONA_WEBHOOK_SECRET], invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('method not allowed');
      return;
    }

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
    const sigHeader = req.get('Persona-Signature');
    if (!verifySignature(sigHeader, rawBody, PERSONA_WEBHOOK_SECRET.value())) {
      // Diagnostics only — never log signature values or the body itself.
      const parts = (sigHeader ?? '').split(',').map((p) => p.trim());
      logger.warn('personaWebhook: invalid signature', {
        hasHeader: !!sigHeader,
        hasTimestamp: parts.some((p) => p.startsWith('t=')),
        v1Count: parts.filter((p) => p.startsWith('v1=')).length,
        bodyLength: rawBody.length,
        secretLength: PERSONA_WEBHOOK_SECRET.value().length,
      });
      res.status(401).send('invalid signature');
      return;
    }

    // Signature verified past this point. Always 200 so Persona doesn't retry events
    // we can't act on (unknown types, missing users) — retries wouldn't change those.
    try {
      const eventId = req.body?.data?.id ?? '';
      const event = req.body?.data?.attributes;
      const eventName = event?.name ?? '';
      const inquiry = event?.payload?.data;
      const uid = inquiry?.attributes?.['reference-id'];
      const inquiryId = inquiry?.id ?? '';

      // inquiry.approved is the decision; inquiry.completed covers templates without
      // a review step. Failure events don't touch `verified` — they only stamp
      // users.persona so support can debug from Firestore instead of the Persona
      // dashboard. Everything else is logged and ignored.
      const FAILURE_STATUS = {
        'inquiry.failed': 'failed',
        'inquiry.declined': 'declined',
        'inquiry.expired': 'expired',
      };
      const isApproval = ['inquiry.approved', 'inquiry.completed'].includes(eventName);
      if (!isApproval && !FAILURE_STATUS[eventName]) {
        logger.info('personaWebhook: ignoring event', { eventName, inquiryId });
        res.status(200).send('ignored');
        return;
      }
      if (!uid) {
        logger.warn('personaWebhook: event without reference-id', { eventName, inquiryId });
        res.status(200).send('no reference-id');
        return;
      }

      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        logger.warn('personaWebhook: user not found', { uid, inquiryId });
        res.status(200).send('user not found');
        return;
      }

      if (!isApproval) {
        // Merge via dot paths so a failed retry doesn't wipe an earlier approval's
        // verifiedAt/eventId (an already-verified user keeps verified: true).
        await userRef.update({
          'persona.status': FAILURE_STATUS[eventName],
          'persona.inquiryId': inquiryId,
          'persona.lastFailedAt': FieldValue.serverTimestamp(),
          'persona.environment': PERSONA_ENVIRONMENT.value(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        logger.info('personaWebhook: failure recorded', { uid, inquiryId, eventName });
        res.status(200).send('failure recorded');
        return;
      }

      if (userSnap.data().verified === true) {
        res.status(200).send('already verified');
        return;
      }

      await userRef.update({
        verified: true,
        trustLevel: 3,
        persona: {
          status: 'approved',
          inquiryId,
          eventId,
          verifiedAt: FieldValue.serverTimestamp(),
          environment: PERSONA_ENVIRONMENT.value(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      await syncVerifiedCaches(uid);
      logger.info('personaWebhook: user verified', { uid, inquiryId, eventId, eventName });
      res.status(200).send('ok');
    } catch (e) {
      // Signature was valid, so a retry may succeed (e.g. transient Firestore error).
      logger.error('personaWebhook: processing failed', e);
      res.status(500).send('error');
    }
  }
);

module.exports = { personaWebhook };
