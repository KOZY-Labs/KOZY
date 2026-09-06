// Chat push notification triggers (Stage D). The database lives in the nam5
// multi-region; functions themselves need a concrete region (us-central1, inside
// nam5) and the CLI points the Eventarc trigger at the database's location.
// Shapes come from lib/db/chats.js: chats/{chatId} carries requesterId/ownerId/
// participants/participantsInfo/requestStatus/lastMessage; messages carry
// senderId/text/type (text|system).
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { db } = require('./admin');
const { sendChatPush } = require('./expoPush');

const REGION = 'us-central1';

const displayName = (chat, uid) => chat.participantsInfo?.[uid]?.name || 'Someone';

// ① New chat request → notify the listing owner (includes the first-message preview,
// which is why ② skips the requester's opening message).
const notifyChatRequested = onDocumentCreated(
  { document: 'chats/{chatId}', region: REGION },
  async (event) => {
    const chat = event.data?.data();
    if (!chat?.ownerId) return;
    const name = displayName(chat, chat.requesterId);
    await sendChatPush(chat.ownerId, {
      title: 'New chat request',
      body: chat.lastMessage
        ? `${name}: ${chat.lastMessage}`
        : `${name} wants to chat about "${chat.listing?.title ?? 'your listing'}"`,
      chatId: event.params.chatId,
    });
  }
);

// ② New message → notify every participant except the sender and deleted accounts.
const notifyNewMessage = onDocumentCreated(
  { document: 'chats/{chatId}/messages/{messageId}', region: REGION },
  async (event) => {
    const msg = event.data?.data();
    if (!msg || msg.type === 'system' || !msg.senderId) return;

    const chatSnap = await db.doc(`chats/${event.params.chatId}`).get();
    if (!chatSnap.exists) return;
    const chat = chatSnap.data();

    // The request flow writes the first message right after the chat doc, and ①
    // already carried its preview — sending both would double-notify the owner.
    const chatCreatedAt = chat.createdAt?.toMillis?.() ?? 0;
    const messageAt = msg.createdAt?.toMillis?.() ?? Date.parse(event.time);
    if (msg.senderId === chat.requesterId && Math.abs(messageAt - chatCreatedAt) < 15000) return;

    const recipients = (chat.participants ?? []).filter(
      (uid) => uid !== msg.senderId && !chat.participantsInfo?.[uid]?.deleted
    );
    await Promise.all(
      recipients.map((uid) =>
        sendChatPush(uid, {
          title: displayName(chat, msg.senderId),
          body: msg.text ?? '',
          chatId: event.params.chatId,
        })
      )
    );
  }
);

// ③ Request accepted (pending → accepted) → notify the requester.
const notifyRequestAccepted = onDocumentUpdated(
  { document: 'chats/{chatId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (after.requestStatus !== 'accepted' || before.requestStatus === 'accepted') return;
    if (!after.requesterId) return;
    await sendChatPush(after.requesterId, {
      title: 'Chat request accepted',
      body: `${displayName(after, after.ownerId)} accepted your chat request. Say hi!`,
      chatId: event.params.chatId,
    });
  }
);

module.exports = { notifyChatRequested, notifyNewMessage, notifyRequestAccepted };
