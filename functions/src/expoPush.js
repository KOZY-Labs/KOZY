// Expo push sender shared by the chat notification triggers.
// Design notes (JOOPI post-mortem applied):
//  - invalid-token cleanup: DeviceNotRegistered deletes users.fcmToken so uninstalled
//    devices stop receiving sends (JOOPI's biggest gap — it never cleaned tokens)
//  - the notifPrefs.push gate lives here so every trigger honors the account toggle
//  - data always carries { chatId, recipientId } — the client drops notifications
//    whose recipientId doesn't match the signed-in uid (device account-switch guard)
const { Expo } = require('expo-server-sdk');
const { FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { db } = require('./admin');

const expo = new Expo();

// Push notification body preview cap — keeps payloads well under Expo's limits.
const BODY_MAX = 140;

function truncate(text) {
  const t = (text ?? '').trim();
  return t.length > BODY_MAX ? `${t.slice(0, BODY_MAX - 1)}…` : t;
}

// Sends one chat push to one user, honoring their prefs and token state.
// Fire-and-forget semantics: failures are logged, never thrown — a push problem
// must not fail the Firestore trigger (and retries would double-notify).
async function sendChatPush(uid, { title, body, chatId }) {
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) return;
    const user = userSnap.data();
    if (user.notifPrefs?.push === false) return;

    const token = user.fcmToken;
    if (!token || !Expo.isExpoPushToken(token)) return;

    const [ticket] = await expo.sendPushNotificationsAsync([
      {
        to: token,
        sound: 'default',
        title,
        body: truncate(body),
        data: { chatId, recipientId: uid },
        // Android: without an explicit channel the message lands on FCM's fallback
        // channel (default importance — silent shade entry, no heads-up banner).
        // 'default' is the HIGH-importance channel the app creates at startup
        // (lib/notifications.js configureNotifications).
        channelId: 'default',
        priority: 'high',
      },
    ]);

    // Ticket-level DeviceNotRegistered covers the common uninstall case. (Expo also
    // reports it in receipts fetched later; a scheduled receipt sweep isn't worth
    // its complexity at this scale — a stale token just gets cleaned on the next send.)
    if (ticket?.status === 'error') {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await db.collection('users').doc(uid).update({ fcmToken: FieldValue.delete() });
        logger.info('expoPush: cleared dead token', { uid });
      } else {
        logger.warn('expoPush: ticket error', { uid, error: ticket.details?.error, message: ticket.message });
      }
    }
  } catch (e) {
    logger.error('expoPush: send failed', { uid, error: e?.message });
  }
}

module.exports = { sendChatPush };
