import { Pressable, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import AppText from '@/components/ui/appText';
import { colors } from '@/constants/colors';

export default function ResultVideoCard({
  item,
  onPress,
  accessory,
  style,
  accessibilityLabel,
}) {
  const player = useVideoPlayer(item?.videoUrl, (playerInstance) => {
    if (!playerInstance) return;

    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.play();
  });

  const title = item?.title ?? 'Listing';
  const location = [item?.city, item?.province].filter(Boolean).join(', ');
  const price = item?.price ? `$${item.price} / month` : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Open ${title}`}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
    >
      <View style={styles.video}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
      <View style={styles.cardInfo}>
        <AppText variant="body-xsm-strong" color="primary" numberOfLines={1}>
          {title}
        </AppText>
        {location ? (
          <AppText variant="body-xsm" color="placeholder" numberOfLines={1}>
            {location}
          </AppText>
        ) : null}
        {price ? (
          <AppText variant="body-xsm-strong" color="primary">
            {price}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47.5%',
    gap: 8,
  },
  video: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.base.gray800,
  },
  accessory: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  cardInfo: {
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
