import { router, useLocalSearchParams } from 'expo-router';

import ListingReelScreen from '@/components/ui/listingReelScreen';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { useListingActions } from '@/hooks/use-listing-actions';

// Tab bar visibility for the search flow is handled centrally in (tabs)/_layout.jsx.
export default function SearchResultListItem() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const handleBack = () => {
    // Pop the stack so back always slides left-to-right and returns to the screen
    // that pushed this one with its state intact.
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // No history (deep link) — the search screen is the flow's entry point.
    router.replace('/home/search');
  };

  return (
    <ListingReelScreen
      listingId={id}
      onBack={handleBack}
      renderOverlay={(item, insets) => <SearchReelOverlay item={item} insets={insets} />}
    />
  );
}

function SearchReelOverlay({ item, insets }) {
  const { isSaved, onToggleSave, onShare, onReport } = useListingActions(item, {
    reportBackTo: '/(tabs)/home/search',
  });

  return (
    <ListingReelOverlay
      item={item}
      bottom={insets.bottom + 44}
      isSaved={isSaved}
      onToggleSave={onToggleSave}
      onShare={onShare}
      onPressDetail={() => router.push({
        pathname: '/home/[id]',
        // backTo is only a deep-link fallback — normal back pops the stack, so the
        // reel's own route (which restores the listing by id) is all it needs.
        params: { id: item.id, backTo: `/home/search/${item.id}` },
      })}
      onPressReport={onReport}
      showMoreAction
      showShareAction
      showSaveAction
    />
  );
}
