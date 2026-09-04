import { router, useLocalSearchParams } from 'expo-router';

import AppButton from '@/components/ui/appButton';
import ListingDetailScreen from '@/components/ui/listingDetailScreen';

// Tab bar visibility is handled centrally in (tabs)/_layout.jsx.
export default function UploadedPostDetail() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  return (
    <ListingDetailScreen
      listingId={listingId}
      reportBackTo={`/(tabs)/post/uploadedPost/detail/${listingId}`}
      backFallback={`/(tabs)/post/uploadedPost/${listingId}`}
      // Pick up edits made in the post flow when coming back from /post/edit/[id].
      reloadOnFocus
      footer={(item) => (
        <AppButton
          text="Edit Listing"
          type="secondary"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/post/edit/[id]',
              params: {
                id: item.id,
                backTo: `/(tabs)/post/uploadedPost/detail/${item.id}`,
              },
            })
          }
        />
      )}
    />
  );
}
