import { Alert, StyleSheet, View } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';

import AppIconButton from '@/components/ui/appIconButton';

export default function ListingDetailHeaderActions({ isSaved, onToggleSave, onShare, onReport }) {
  const handleMorePress = () => {
    Alert.alert('More options', undefined, [
      { text: 'Report Listing', style: 'destructive', onPress: () => onReport?.() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.row}>
      <AppIconButton
        icon={<MaterialIcons name={isSaved ? 'favorite' : 'favorite-border'} />}
        type="bare"
        onPress={onToggleSave}
        accessibilityLabel={isSaved ? 'Unsave listing' : 'Save listing'}
      />
      <AppIconButton
        icon={<Feather name="share-2" />}
        type="bare"
        onPress={onShare}
        accessibilityLabel="Share listing"
      />
      <AppIconButton
        icon={<Feather name="more-horizontal" />}
        type="bare"
        onPress={handleMorePress}
        accessibilityLabel="More options"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingRight: 4,
  },
});
