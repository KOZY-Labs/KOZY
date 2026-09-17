// Listing grid card (saved list, my listings, map area sheet). Static cover photo
// by default, with an opt-in inline preview: the parent list keeps ONE previewing
// card at a time, so at most one MediaCodec decoder is ever alive. (Autoplaying
// every card ran 4–6 decoders on a 2-column grid, which stalled the Android UI
// thread — dropped header/back taps — and was the pressure behind the earlier
// MediaCodec OOM.) Card tap opens the reel; the preview is just a taste.
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import AppText from '@/components/ui/appText';
import { colors } from '@/constants/colors';

// Mounted only while previewing — the player (and its decoder) lives and dies
// with this component.
function InlinePreview({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

export default function ResultVideoCard({
  item,
  onPress,
  accessory,
  style,
  accessibilityLabel,
  previewing = false, // parent-owned: only one card in a list previews at a time
  onTogglePreview,
}) {
  const cover = item?.images?.[0] ?? null;
  const hasVideo = !!item?.videoUrl;

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
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : null}
        {hasVideo && previewing ? <InlinePreview url={item.videoUrl} /> : null}
        {hasVideo && onTogglePreview ? (
          <Pressable
            onPress={onTogglePreview}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={previewing ? 'Stop preview' : 'Preview video'}
            style={({ pressed }) => [styles.previewPill, pressed && styles.pressed]}
          >
            <Feather name={previewing ? 'square' : 'play'} size={12} color="#fff" />
            <AppText variant="body-xsm-strong" textColor="#fff">
              {previewing ? 'Stop' : 'Preview'}
            </AppText>
          </Pressable>
        ) : null}
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
    marginBottom: "5%",
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
  previewPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cardInfo: {
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
