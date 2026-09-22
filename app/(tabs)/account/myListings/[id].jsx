import { router, useLocalSearchParams } from 'expo-router';

import ListingReelScreen from '@/components/ui/listingReelScreen';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { parseIds } from '@/lib/routeParams';

// Tab bar visibility is handled centrally in (tabs)/_layout.jsx.
export default function MyList() {
  const { id, ids } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  return (
    <ListingReelScreen
      listingId={listingId}
      ids={parseIds(ids)}
      renderOverlay={(item, insets) => (
        <ListingReelOverlay
          item={item}
          bottom={insets.bottom + 44}
          onPressDetail={() => router.push(`/(tabs)/account/myListings/detail/${item.id}`)}
        />
      )}
    />
  );
}
