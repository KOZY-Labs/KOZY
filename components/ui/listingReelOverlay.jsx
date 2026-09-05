import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Avatar } from 'react-native-elements';
import { colors } from '@/constants/colors';

// IG/TikTok-style legibility: one full-width black gradient over the bottom of the
// video (not per-element boxes), plus subtle text shadows. Tiny generated PNG asset —
// no gradient library needed.
const BOTTOM_GRADIENT = require('../../assets/images/reel-bottom-gradient.png');

import AppButton from '@/components/ui/appButton';
import AppIconButton from '@/components/ui/appIconButton';
import AppText from '@/components/ui/appText';
import { showConfirmModal } from '@/components/ui/confirmModalHost';

import { avatarSource } from '@/lib/avatar';

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

  // Centered app-styled modal instead of a floating dropdown.
  const handleMorePress = () => {
    showConfirmModal({
      title: 'More options',
      primaryText: 'Report Listing',
      secondaryText: 'Cancel',
      onPrimary: () => onPressReport?.(item),
    });
  };

  return (
    <>
    <Image
      source={BOTTOM_GRADIENT}
      style={styles.bottomGradient}
      resizeMode="stretch"
      pointerEvents="none"
    />
    {hasRightActions ? (
        <View style={[styles.rightActions, { bottom, transformOrigin: "top right" }, { transform: isPreview ? [{ scale: 0.9 }] : [{ scale: 1 }] }]}>
          {onToggleSave ? (
            <AppIconButton
              icon={<MaterialIcons name={isSaved ? 'favorite' : 'favorite-border'} />}
              shadow
              type="bare"
              onPress={() => onToggleSave?.(item)}
            />
          ) : null}
          {onShare ? (
            <AppIconButton
              icon={<Feather name="share-2" />}
              shadow
              type="bare"
              onPress={() => onShare?.(item)}
            />
          ) : null}
          {showMoreAction ? (
            <AppIconButton
              icon={<Feather name="more-horizontal" />}
              shadow
              type="bare"
              onPress={handleMorePress}
            />
          ) : null}
        </View>
        ) : null
      }
      <View style={[styles.bottomLeft, { bottom, maxWidth: hasRightActions ? '90%' : '95%', transformOrigin: "top left", transform: isPreview ? [{ scale: 0.9 }] : [{ scale: 1 }] }]}>
        {/* The whole info block (avatar, title, price, tags) opens the detail, not just the button */}
        <Pressable
          onPress={onPressDetail}
          disabled={!onPressDetail}
          accessibilityRole={onPressDetail ? 'button' : undefined}
          accessibilityLabel="Open listing detail"
        >
          <View style={styles.bottomRoomInfo}>
            <View>
              <Avatar
                source={avatarSource(item?.owner?.avatar)}
                size={44}
                rounded
                containerStyle={styles.avatar}
              />
              {item?.owner?.verified ? (
                // Same mark as ProfileSection's name-row badge (detail screen), docked
                // on the avatar since the reel doesn't show the owner's name.
                <View style={styles.verifiedBadge} accessibilityLabel="Verified user">
                  <Feather name="check-circle" size={14} color={colors.base.success} />
                </View>
              ) : null}
            </View>
            <View style={styles.bottomInfo}>
              <AppText variant="body-sm-strong" numberOfLines={1} style={styles.textShadow}>
                {item?.title}
              </AppText>
              <AppText variant="body-sm" style={styles.textShadow}>
                ${item?.price} / month
              </AppText>
            </View>
            <View style={styles.bottomCTA}>
              <AppButton text="Detail" size="sm" type="primary" onPress={onPressDetail} />
            </View>
          </View>
          <AppText variant="body-sm-strong" numberOfLines={2} style={styles.textShadow}>
            #{item?.city} #{item?.province}
          </AppText>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    width: '100%',
  },
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
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  verifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 9999,
    padding: 2,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomCTA: {
    width: 67,
  },
});
