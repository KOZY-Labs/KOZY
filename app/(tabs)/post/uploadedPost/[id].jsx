import { Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import ListingReelScreen from '@/components/ui/listingReelScreen';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';

// Tab bar visibility for post sub-screens is handled centrally in (tabs)/_layout.jsx.
export default function UploadedPost() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  const onShare = async () => {
    try {
      await Share.share({
        message: 'Check this out! 👀',
        url: 'https://example.com',
        title: 'Share link',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <ListingReelScreen
      listingId={listingId}
      onBack={() => router.dismissTo('/(tabs)/post')}
      renderOverlay={(item, insets) => (
        <ListingReelOverlay
          item={item}
          bottom={insets.bottom + 44}
          onShare={onShare}
          onPressDetail={() => router.push(`/(tabs)/post/uploadedPost/detail/${item.id}`)}
          showMoreAction
          showShareAction
        />
      )}
    />
  );
}
