import { Alert, StyleSheet, View } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Avatar } from 'react-native-elements';

import AppButton from '@/components/ui/appButton';
import AppIconButton from '@/components/ui/appIconButton';
import AppText from '@/components/ui/appText';

const AVATAR_PLACEHOLDER = require('@/assets/images/Avatar-placeholder.png');

export default function ListingReelOverlay({
  item,
  bottom,
  isPreview = true,
  isSaved,
  onToggleSave,
  onShare,
  onPressDetail,
  onPressReport,
  showMoreAction = false,
  onRepeat,
}) {
  const hasRightActions = showMoreAction || onToggleSave || onShare;

  // Centered modal (native alert) instead of a floating dropdown.
  const handleMorePress = () => {
    Alert.alert('More options', undefined, [
      { text: 'Report Listing', style: 'destructive', onPress: () => onPressReport?.() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
    {hasRightActions ? (
        <View style={[styles.rightActions, { bottom, transformOrigin: "top right" }, { transform: isPreview ? [{ scale: 0.9 }] : [{ scale: 1 }] }]}>
          {onToggleSave ? (
            <AppIconButton
              icon={<MaterialIcons name={isSaved ? 'favorite' : 'favorite-border'} />}
              type="bare"
              onPress={() => onToggleSave?.(item)}
            />
          ) : null}
          {onShare ? (
            <AppIconButton
              icon={<Feather name="share-2" />}
              type="bare"
              onPress={() => onShare?.(item)}
            />
          ) : null}
          {showMoreAction ? (
            <AppIconButton
              icon={<Feather name="more-horizontal" />}
              type="bare"
              onPress={handleMorePress}
            />
          ) : null}
        </View>
        ) : null
      }
      <View style={[styles.bottomLeft, { bottom, maxWidth: hasRightActions ? '90%' : '95%', transformOrigin: "top left", transform: isPreview ? [{ scale: 0.9 }] : [{ scale: 1 }] }]}>
        <View style={styles.bottomRoomInfo}>
          <Avatar
            source={item?.owner?.avatar?.[0] ? { uri: item.owner.avatar[0] } : AVATAR_PLACEHOLDER}
            size={44}
            rounded
            containerStyle={styles.avatar}
          />
          <View style={styles.bottomInfo}>
            <AppText variant="body-sm-strong" numberOfLines={1}>
              {item?.title}
            </AppText>
            <AppText variant="body-sm">
              ${item?.price} / month
            </AppText>
          </View>
          <View style={styles.bottomCTA}>
            <AppButton text="Detail" size="sm" type="primary" onPress={onPressDetail} />
          </View>
        </View>
        <AppText variant="body-sm-strong" numberOfLines={2}>
          #{item?.city} #{item?.province}
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  rightActions: {
    position: 'absolute',
    right: 20,
    gap: 22,
    alignItems: 'center',
  },
  bottomLeft: {
    position: 'absolute',
    left: 20,
  },
  bottomRoomInfo: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    backgroundColor: 'gray',
  },
  bottomInfo: {
    flex: 1,
  },
  bottomCTA: {
    width: 67,
  },
});
