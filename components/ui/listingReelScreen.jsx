// Shared shell for single-listing reel routes (search reel, saved-list reel, my
// listings, uploaded post): data fetch, loading/not-found states, back button,
// and the video player (loop, always muted, tap-to-play/pause + custom progress
// bar). The overlay actions differ per screen, so callers render them via
// renderOverlay(item, insets).
//
// Pass `ids` (the ordered list the user came from — a map area, the saved list…)
// to turn the screen into a vertical pager: swipe up/down moves to the next /
// previous listing in that list and the ends simply bounce. Only the visible
// page holds a video decoder; the others show their cover photo.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, StyleSheet, useWindowDimensions, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import AppIconButton from '@/components/ui/appIconButton';
import AppText from '@/components/ui/appText';
import VideoReelControls from '@/components/ui/videoReelControls';
import { colors } from '@/constants/colors';
import { TOP_INSET_EXTRA } from '@/constants/layout';
import { useListing } from '@/hooks/use-listings';

export default function ListingReelScreen({ listingId, ids, onBack, renderOverlay }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // De-dupe and make sure the entry listing is in the list (a stale ids param
  // must never hide the listing the user actually tapped).
  const pages = useMemo(() => {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    const unique = [...new Set(list)];
    return unique.includes(listingId) ? unique : [listingId, ...unique];
  }, [ids, listingId]);
  const startIndex = Math.max(pages.indexOf(listingId), 0);
  const [activeIndex, setActiveIndex] = useState(startIndex);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const getItemLayout = useCallback(
    (_, index) => ({ length: height, offset: height * index, index }),
    [height]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { top: insets.top + 12 + TOP_INSET_EXTRA }]}>
        <AppIconButton
          icon={<Feather name="chevron-left" size={28} />}
          type="ghost"
          size="lg"
          shadow
          onPress={onBack ?? (() => router.back())}
        />
      </View>
      {pages.length > 1 ? (
        <FlatList
          data={pages}
          keyExtractor={(id) => id}
          renderItem={({ item: id, index }) => (
            <ReelPage
              listingId={id}
              isActive={index === activeIndex}
              height={height}
              insets={insets}
              renderOverlay={renderOverlay}
            />
          )}
          initialScrollIndex={startIndex}
          getItemLayout={getItemLayout}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
        />
      ) : (
        <ReelPage listingId={listingId} isActive height={height} insets={insets} renderOverlay={renderOverlay} />
      )}
    </View>
  );
}

function ReelPage({ listingId, isActive, height, insets, renderOverlay }) {
  const { data: item, loading, reload } = useListing(listingId);

  // While the upload-time transcode runs (videoStatus 'processing', usually well
  // under 2 minutes) poll the doc so the reel starts on its own when it's done.
  const processing = item?.videoStatus === 'processing';
  useEffect(() => {
    if (!processing) return undefined;
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [processing, reload]);

  if (loading) {
    return (
      <View style={[styles.center, { height }]}>
        <ActivityIndicator color={colors.base.white} />
      </View>
    );
  }
  if (!item) {
    return (
      <View style={[styles.center, { height }]}>
        <AppText variant="body-md" color="primary">Listing not found</AppText>
      </View>
    );
  }
  if (processing) {
    return (
      <View style={[styles.center, { height }]}>
        <ActivityIndicator color={colors.base.white} size="large" />
        <AppText variant="body-md" color="primary" style={{ marginTop: 16 }}>
          Optimizing video…
        </AppText>
        <AppText variant="body-xsm" style={{ color: colors.semantic.text.tertiary, marginTop: 4 }}>
          This usually takes under a minute.
        </AppText>
      </View>
    );
  }
  return <Reel item={item} isActive={isActive} height={height} insets={insets} renderOverlay={renderOverlay} />;
}

function Reel({ item, isActive, height, insets, renderOverlay }) {
  const isScreenFocused = useIsFocused();
  const [paused, setPaused] = useState(false);
  // Only the visible page gets a real source — useVideoPlayer re-creates the
  // player when the source changes, so swiping away releases the decoder and
  // swiping back starts it fresh (cover photo shows in between).
  const player = useVideoPlayer(isActive ? (item.videoUrl ?? null) : null, (p) => {
    if (!p) return;
    p.loop = true;
    p.muted = true;
  });

  // Pause while another screen is pushed on top (report form, listing detail…)
  // and resume in place on return. Deliberately NOT the home feed's unload —
  // there's a single player here, and unloading forced a laggy full reload from
  // 0:00 on every return. A user-initiated pause survives the round trip.
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  useEffect(() => {
    if (!player) return;
    if (!isScreenFocused || !isActive) {
      player.pause();
      return;
    }
    if (!pausedRef.current) player.play();
  }, [isScreenFocused, isActive, player]);

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

  const cover = item.images?.[0];

  return (
    <Pressable style={[styles.reel, { height }]} onPress={togglePlay}>
      {cover ? (
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      {isActive ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />
      ) : null}
      {renderOverlay?.(item, insets)}
      {isActive ? (
        <VideoReelControls
          player={player}
          paused={paused}
          bottomOffset={insets.bottom + 12}
        />
      ) : null}
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
