import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { showAuthGate } from '@/lib/authGate';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import { gateProfileComplete } from '@/lib/profileCompleteness';
import { requestChat } from '@/lib/db/chats';
import { ownerFromProfile } from '@/lib/listingDraft';

// Shared chat-request flow for listing detail screens: auth gate → own-listing guard →
// profile-completeness gate → requestChat. `backTo` is where the gates return the user;
// `onSuccess(chatId)` lets each screen keep its own success feedback (navigate / modal).
export function useChatRequest(item, { backTo, onSuccess } = {}) {
  const { uid, profile } = useAuth();
  const [requesting, setRequesting] = useState(false);

  const sendChatRequest = async () => {
    if (!uid) {
      showAuthGate({
        title: 'Start chatting with your match 💬',
        message: 'Sign Up or Log In to connect with potential roommates.',
        redirect: backTo,
      });
      return;
    }
    if (uid === item?.ownerId) {
      showAlertModal({ title: 'This is your listing', message: 'You can’t send a chat request to yourself.' });
      return;
    }
    // Chatting requires a complete profile (everything except About Me).
    if (!gateProfileComplete(profile, { backTo })) return;
    setRequesting(true);
    try {
      const chatId = await requestChat({
        listing: item,
        requesterId: uid,
        requesterInfo: ownerFromProfile(profile),
        firstMessage: `Hi, I'm interested in your listing at ${item.street}, ${item.city}. Is it still available?`,
      });
      onSuccess?.(chatId);
    } catch (e) {
      showAlertModal({ title: 'Request failed', message: e?.message ?? 'Please try again.' });
    } finally {
      setRequesting(false);
    }
  };

  return { sendChatRequest, requesting };
}
