import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import ListingReelScreen from '@/components/ui/listingReelScreen';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { useListingActions } from '@/hooks/use-listing-actions';

// Tab bar visibility is handled centrally in (tabs)/_layout.jsx.
export default function SavedList() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  return (
    <ListingReelScreen
      listingId={listingId}
      renderOverlay={(item, insets) => <SavedReelOverlay item={item} insets={insets} />}
    />
  );
}

function SavedReelOverlay({ item, insets }) {
  const { isSaved, onToggleSave, onShare } = useListingActions(item, {
    reportBackTo: '/(tabs)/account/savedList',
  });

  // Unsaving from the saved-list reel returns to the list (the reel no longer belongs there).
  const handleToggleSave = useCallback(async () => {
    const nowSaved = await onToggleSave();
    if (nowSaved === false) router.back();
  }, [onToggleSave]);

  return (
    <ListingReelOverlay
      item={item}
      bottom={insets.bottom + 44}
      isSaved={isSaved}
      onToggleSave={handleToggleSave}
      onShare={onShare}
      onPressDetail={() => router.push(`/(tabs)/account/savedList/detail/${item.id}`)}
      showRepeatAction
    />
  );
}
