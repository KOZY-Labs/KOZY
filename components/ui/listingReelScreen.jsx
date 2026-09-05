// Shared shell for single-listing reel routes (search reel, saved-list reel): data
// fetch, loading/not-found states, back button, and the video player (loop, always
// muted, tap-to-play/pause + custom progress bar). The overlay actions differ per
// screen, so callers render them via renderOverlay(item, insets).
import { useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Pressable, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import AppIconButton from '@/components/ui/appIconButton';
import AppText from '@/components/ui/appText';
import VideoReelControls from '@/components/ui/videoReelControls';
import { colors } from '@/constants/colors';
import { useListing } from '@/hooks/use-listings';

export default function ListingReelScreen({ listingId, onBack, renderOverlay }) {
  const insets = useSafeAreaInsets();
  const { data: item, loading, reload } = useListing(listingId);

  // While the upload-time transcode runs (videoStatus 'processing', usually well
  // under 2 minutes) poll the doc so the reel starts on its own when it's done.
  const processing = item?.videoStatus === 'processing';
  useEffect(() => {
    if (!processing) return undefined;
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [processing, reload]);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <AppIconButton
          icon={<Feather name="arrow-left" size={32} />}
          type="ghost"
          size="lg"
          shadow
          onPress={onBack ?? (() => router.back())}
        />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.base.white} />
        </View>
      ) : !item ? (
        <View style={styles.center}>
          <AppText variant="body-md" color="primary">Listing not found</AppText>
        </View>
      ) : processing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.base.white} size="large" />
          <AppText variant="body-md" color="primary" style={{ marginTop: 16 }}>
            Optimizing video…
          </AppText>
          <AppText variant="body-xsm" style={{ color: colors.semantic.text.tertiary, marginTop: 4 }}>
            This usually takes under a minute.
          </AppText>
        </View>
      ) : (
        <Reel item={item} insets={insets} renderOverlay={renderOverlay} />
      )}
    </View>
  );
}

function Reel({ item, insets, renderOverlay }) {
  const { height } = useWindowDimensions();
  const [paused, setPaused] = useState(false);
  const player = useVideoPlayer(item.videoUrl ?? null, (p) => {
    if (!p) return;
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    player?.play();
  }, [player]);

  const togglePlay = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
      setPaused(true);
    } else {
      player.play();
      setPaused(false);
    }
  };

  return (
    <Pressable style={[styles.reel, { height }]} onPress={togglePlay}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      {renderOverlay?.(item, insets)}
      <VideoReelControls
        player={player}
        paused={paused}
        bottomOffset={insets.bottom + 12}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  reel: {
    width: '100%',
    backgroundColor: 'black',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
});
