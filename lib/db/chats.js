// chats collection + chats/{chatId}/messages subcollection.
// Chat-request flow: requestStatus is stored viewer-neutral
// ('pending' | 'accepted' | 'declined'); chatViewModel() derives the
// per-viewer label/canAccept (the mock's pending_sent/pending_received split).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateUserDoc } from '@/lib/db/users';

const COL = 'chats';

const chatRef = (chatId) => doc(db, COL, chatId);
const messagesRef = (chatId) => collection(db, COL, chatId, 'messages');

function mapSnap(snap) {
  return { id: snap.id, ...snap.data() };
}

// Deterministic chat id per (listing, requester) so duplicate requests collapse.
export function buildChatId(listingId, requesterId) {
  return `${listingId}_${requesterId}`;
}

export async function getChat(chatId) {
  const snap = await getDoc(chatRef(chatId));
  if (!snap.exists()) return null;
  return mapSnap(snap);
}

// All chats the user participates in, newest activity first.
export async function listChatsForUser(uid) {
  const q = query(
    collection(db, COL),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapSnap);
}

export function subscribeToChats(uid, callback) {
  const q = query(
    collection(db, COL),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapSnap)));
}

export function subscribeToChat(chatId, callback) {
  return onSnapshot(chatRef(chatId), (snap) => {
    callback(snap.exists() ? mapSnap(snap) : null);
  });
}

// Requester starts a chat request against a listing owner. `listing` is the full listing
// (its denormalized `owner` becomes the owner's display info); `requesterInfo` is the
// requester's display profile (ownerFromProfile shape). Status is stored viewer-neutral
// ('pending') — use chatViewModel() to derive the per-viewer label/canAccept.
export async function requestChat({ listing, requesterId, requesterInfo, firstMessage }) {
  const ownerId = listing.ownerId;
  const chatId = buildChatId(listing.id, requesterId);

  // Re-requesting an existing chat must not reset its status/messages.
  const existing = await getChat(chatId);
  if (existing) return chatId;

  await setDoc(chatRef(chatId), {
    listingId: listing.id,
    listing: {
      id: listing.id,
      title: listing.title ?? '',
      street: listing.street ?? '',
      city: listing.city ?? '',
      province: listing.province ?? '',
      image: listing.images?.[0] ?? null,
    },
    requesterId,
    ownerId,
    participants: [requesterId, ownerId],
    participantsInfo: {
      [requesterId]: requesterInfo ?? null,
      [ownerId]: listing.owner ?? null,
    },
    requestStatus: 'pending',
    lastMessage: firstMessage ?? '',
    lastMessageAt: serverTimestamp(),
    // The request itself is the owner's one unread item; the embedded first message
    // below deliberately doesn't increment again (no otherIds passed).
    unreadCounts: { [ownerId]: 1, [requesterId]: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(messagesRef(chatId), {
    type: 'system',
    text: 'Chat request sent',
    senderId: requesterId,
    createdAt: serverTimestamp(),
  });

  if (firstMessage) {
    await sendMessage(chatId, { senderId: requesterId, text: firstMessage, status: 'pending' });
  }
  return chatId;
}

export async function acceptChat(chatId, accepterId) {
  await updateDoc(chatRef(chatId), {
    requestStatus: 'accepted',
    updatedAt: serverTimestamp(),
  });
  await addDoc(messagesRef(chatId), {
    type: 'system',
    text: 'Chat request accepted',
    senderId: accepterId ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function declineChat(chatId) {
  await updateDoc(chatRef(chatId), {
    requestStatus: 'declined',
    updatedAt: serverTimestamp(),
  });
}

// Account deletion: keep the other participant's chat history instead of deleting it.
// Overwrites the leaving user's denormalized info with a "deleted" marker; the UI
// shows a default avatar and disables the input via chatViewModel().otherDeleted.
export async function markUserDeletedInChats(uid) {
  const chats = await listChatsForUser(uid);
  await Promise.all(
    chats.map((chat) =>
      updateDoc(chatRef(chat.id), {
        [`participantsInfo.${uid}`]: { name: 'Deleted User', avatar: [], deleted: true },
        updatedAt: serverTimestamp(),
      })
    )
  );
}

export async function deleteChat(chatId) {
  // Purge the messages subcollection first — orphaned messages would otherwise
  // resurface if the same listing/requester pair starts a new chat (same chatId).
  const snap = await getDocs(messagesRef(chatId));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(chatRef(chatId));
}

// Per-viewer presentation of a chat doc (status label, accept rights, other participant).
export function chatViewModel(chat, viewerId) {
  if (!chat) return null;
  const otherId = chat.participants?.find((p) => p !== viewerId) ?? null;
  const otherInfo = chat.participantsInfo?.[otherId] ?? null;
  const isOwner = chat.ownerId === viewerId;
  const otherDeleted = !!otherInfo?.deleted;
  const status = chat.requestStatus ?? 'pending';
  const isPending = status === 'pending';

  let statusLabel = '';
  if (status === 'accepted') statusLabel = 'Chat request accepted';
  else if (status === 'declined') statusLabel = 'Chat request declined';
  else if (isOwner) statusLabel = `${otherInfo?.name ?? 'Someone'} requested chat`;
  else statusLabel = 'Request has been sent';

  const blockedBy = chat.blockedBy ?? [];
  const blockedByMe = blockedBy.includes(viewerId);
  const blockedByOther = blockedBy.some((uid) => uid !== viewerId);

  return {
    otherId,
    otherInfo,
    isOwner,
    otherDeleted,
    status,
    isPending,
    statusLabel,
    unreadCount: chat.unreadCounts?.[viewerId] ?? 0,
    blockedByMe,
    blockedByOther,
    isBlocked: blockedBy.length > 0,
    canAccept: isPending && isOwner && !otherDeleted && blockedBy.length === 0,
  };
}

// --- messages ---

// Media message previews for the chat list / push body.
const MEDIA_PREVIEW = { image: '📷 Photo', video: '🎥 Video' };

// otherIds: the OTHER participants' uids — each gets its unreadCounts entry
// incremented. Callers that must not count (the request's embedded first message,
// which requestChat already seeded) simply omit it.
export async function sendMessage(
  chatId,
  { senderId, text = '', type = 'text', status = 'sent', mediaUrl = null, otherIds = [] }
) {
  const ref = await addDoc(messagesRef(chatId), {
    senderId,
    text,
    type,
    status,
    ...(mediaUrl ? { mediaUrl } : {}),
    createdAt: serverTimestamp(),
  });
  await updateDoc(chatRef(chatId), {
    lastMessage: MEDIA_PREVIEW[type] ?? text,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...Object.fromEntries(otherIds.map((uid) => [`unreadCounts.${uid}`, increment(1)])),
  });
  return ref.id;
}

// Zero the viewer's own unread counter (on chat-room focus).
export async function clearUnread(chatId, uid) {
  await updateDoc(chatRef(chatId), { [`unreadCounts.${uid}`]: 0 });
}

// Flip the given (other-sender) messages to read. Rules restrict this update to
// participants changing only `status` to 'read' on messages they didn't send —
// callers must filter accordingly (the room builds ids from its in-memory list).
export async function markMessagesRead(chatId, messageIds) {
  if (!messageIds.length) return;
  const batch = writeBatch(db);
  messageIds.forEach((id) => {
    batch.update(doc(db, COL, chatId, 'messages', id), { status: 'read' });
  });
  await batch.commit();
}

// Block: users/{me}.blockedUsers is the source of truth; a neutral `blockedBy`
// array on every shared chat lets both sides render the disabled state without
// revealing who blocked (and without loading the other user's doc).
export async function blockUserInChats(myUid, otherUid) {
  await updateUserDoc(myUid, { blockedUsers: arrayUnion(otherUid) });
  const chats = await listChatsForUser(myUid);
  await Promise.all(
    chats
      .filter((chat) => chat.participants?.includes(otherUid))
      .map((chat) =>
        updateDoc(chatRef(chat.id), {
          blockedBy: arrayUnion(myUid),
          updatedAt: serverTimestamp(),
        })
      )
  );
}

export async function unblockUserInChats(myUid, otherUid) {
  await updateUserDoc(myUid, { blockedUsers: arrayRemove(otherUid) });
  const chats = await listChatsForUser(myUid);
  await Promise.all(
    chats
      .filter((chat) => chat.participants?.includes(otherUid))
      .map((chat) =>
        updateDoc(chatRef(chat.id), {
          blockedBy: arrayRemove(myUid),
          updatedAt: serverTimestamp(),
        })
      )
  );
}

export function subscribeToMessages(chatId, callback) {
  const q = query(messagesRef(chatId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapSnap)));
}

export async function listMessages(chatId) {
  const q = query(messagesRef(chatId), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(mapSnap);
}
