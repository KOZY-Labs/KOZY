// Root-level unread-chat counter for the tab badge (and app-icon badge).
// Lives at the root — not in the chat list screen — so the badge stays live from
// any tab (the reference app only recomputed it while its chat list was mounted,
// which left the badge stale everywhere else).
import { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/context/AuthContext';
import { subscribeToChats } from '@/lib/db/chats';

const ChatBadgeContext = createContext({ unreadTotal: 0 });

export function ChatBadgeProvider({ children }) {
  const { uid } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    if (!uid) {
      setUnreadTotal(0);
      return undefined;
    }
    return subscribeToChats(uid, (chats) => {
      const total = chats.reduce((sum, chat) => {
        // Blocked chats never accrue a visible badge.
        if ((chat.blockedBy ?? []).length > 0) return sum;
        return sum + (chat.unreadCounts?.[uid] ?? 0);
      }, 0);
      setUnreadTotal(total);
    });
  }, [uid]);

  // Mirror onto the OS app-icon badge; best-effort (unsupported contexts throw).
  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadTotal).catch(() => {});
  }, [unreadTotal]);

  return (
    <ChatBadgeContext.Provider value={{ unreadTotal }}>
      {children}
    </ChatBadgeContext.Provider>
  );
}

export function useChatBadge() {
  return useContext(ChatBadgeContext);
}
