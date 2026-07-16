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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  return {
    otherId,
    otherInfo,
    isOwner,
    otherDeleted,
    status,
    isPending,
    statusLabel,
    canAccept: isPending && isOwner && !otherDeleted,
  };
}

// --- messages ---

export async function sendMessage(chatId, { senderId, text, type = 'text', status = 'sent' }) {
  const ref = await addDoc(messagesRef(chatId), {
    senderId,
    text,
    type,
    status,
    createdAt: serverTimestamp(),
  });
  await updateDoc(chatRef(chatId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
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
