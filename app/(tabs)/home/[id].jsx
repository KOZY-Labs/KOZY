import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import ListingDetailScreen from '@/components/ui/listingDetailScreen';

export default function DetailScreen() {
  const { id, backTo } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  const handleBack = useCallback(() => {
    // Prefer popping the stack — returns to whichever screen pushed this one (reel, map
    // card, home feed) without stacking a duplicate instance. `backTo` replace is only a
    // fallback for when there is no navigation history (e.g. deep links).
    if (router.canGoBack()) {
      router.back();
      return;
    }

    const target = Array.isArray(backTo) ? backTo[0] : backTo;
    if (target) {
      router.replace(target);
      return;
    }

    router.back();
  }, [backTo]);

  return (
    <ListingDetailScreen
      listingId={listingId}
      reportBackTo="/(tabs)/home"
      onBack={handleBack}
      showChatCta
      chatBackTo={`/home/${listingId}`}
      onChatSuccess={(chatId) => router.push(`/(tabs)/chat/${chatId}`)}
    />
  );
}

