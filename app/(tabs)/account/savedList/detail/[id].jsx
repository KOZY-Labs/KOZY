import { router, useLocalSearchParams } from 'expo-router';

import ListingDetailScreen from '@/components/ui/listingDetailScreen';
import { showConfirmModal } from '@/components/ui/confirmModalHost';

// Tab bar visibility is handled centrally in (tabs)/_layout.jsx.
export default function SavedListDetail() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  return (
    <ListingDetailScreen
      listingId={listingId}
      reportBackTo="/(tabs)/account/savedList"
      showChatCta
      chatBackTo={`/(tabs)/account/savedList/detail/${listingId}`}
      onChatSuccess={(chatId) =>
        showConfirmModal({
          title: 'Chat Request Sent',
          message: 'Your request has been sent to the room provider. You’ll be notified once it’s accepted.',
          primaryText: 'Open Chat',
          secondaryText: 'Close',
          onPrimary: () => router.push(`/(tabs)/chat/${chatId}`),
        })
      }
    />
  );
}
