// Realtime data hooks for chats and messages.
import { useState, useEffect } from 'react';
import { subscribeToChats, subscribeToChat, subscribeToMessages, buildChatId } from '@/lib/db/chats';

// Normalize Firestore Timestamp / ISO string / Date to an ISO string for display.
function toIso(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// All chats the user participates in (realtime, newest activity first).
export function useChats(uid) {
  const [state, setState] = useState({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsubscribe = subscribeToChats(uid, (chats) =>
      setState({
        data: chats.map((c) => ({ ...c, lastMessageAt: toIso(c.lastMessageAt) })),
        loading: false,
        error: null,
      })
    );
    return unsubscribe;
  }, [uid]);

  return state;
}

// The viewer's existing chat for a listing (realtime; null when none / logged out).
// Used to disable "Send Chat Request" once a request exists.
export function useExistingChat(listingId, uid) {
  const [chat, setChat] = useState(null);

  useEffect(() => {
    if (!listingId || !uid) {
      setChat(null);
      return undefined;
    }
    return subscribeToChat(buildChatId(listingId, uid), setChat);
  }, [listingId, uid]);

  return chat;
}

// A single chat doc + its messages (both realtime).
export function useChatThread(chatId) {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsubChat = subscribeToChat(chatId, (data) => {
      setChat(data);
      setLoading(false);
    });
    const unsubMessages = subscribeToMessages(chatId, (msgs) =>
      setMessages(
        msgs.map((m) => ({
          ...m,
          // serverTimestamp is briefly null on the sender's device — show "now".
          createdAt: toIso(m.createdAt) ?? new Date().toISOString(),
        }))
      )
    );
    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [chatId]);

  return { chat, messages, loading };
}
