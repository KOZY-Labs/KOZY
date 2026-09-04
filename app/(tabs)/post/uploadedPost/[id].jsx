import { router, useLocalSearchParams } from 'expo-router';

import ListingReelScreen from '@/components/ui/listingReelScreen';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { useListingActions } from '@/hooks/use-listing-actions';

// Tab bar visibility for post sub-screens is handled centrally in (tabs)/_layout.jsx.
export default function UploadedPost() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  return (
    <ListingReelScreen
      listingId={listingId}
      onBack={() => router.dismissTo('/(tabs)/post')}
      renderOverlay={(item, insets) => <UploadedPostOverlay item={item} insets={insets} />}
    />
  );
}

function UploadedPostOverlay({ item, insets }) {
  const { onShare, onReport } = useListingActions(item, {
    reportBackTo: `/(tabs)/post/uploadedPost/${item.id}`,
  });

  return (
    <ListingReelOverlay
      item={item}
      bottom={insets.bottom + 44}
      onShare={onShare}
      onPressDetail={() => router.push(`/(tabs)/post/uploadedPost/detail/${item.id}`)}
      onPressReport={onReport}
      showMoreAction
      showShareAction
    />
  );
}
