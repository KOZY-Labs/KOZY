import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import AppIconButton from '@/components/ui/appIconButton';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import VideoReelControls from '@/components/ui/videoReelControls';
import { useBrowseListings } from '@/hooks/use-listings';
import { useListingActions } from '@/hooks/use-listing-actions';

export default function HomeScreen() {

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { data: listings, loading, error, reload } = useBrowseListings();
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      {/* 🔝 Top Bar */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        {/* Dark scrim behind the ghost button so the icon reads on any video frame */}
        <View style={styles.searchScrim}>
          <AppIconButton
            icon={<Feather name="search" />}
            type="ghost"
            size="lg"
            onPress={() => router.push('/home/search')}
            accessibilityLabel="Search listings"
          />
        </View>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.statusText}>Couldn’t load listings.</Text>
          <Pressable onPress={reload} hitSlop={10}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.statusText}>No listings yet.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item: reel, index }) => (
            <ReelItem
              item={reel}
              isActive={index === activeIndex}
              insets={insets}
              height={height}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
        />
      )}
    </View>
  );
}

/* Reel Item — memoized so swipes only re-render the rows whose props changed.
   Owns its listing actions via the shared hook (per-item saved state via the store
   subscription), so the feed and the detail screens can never drift. */
const ReelItem = React.memo(function ReelItem({ item, isActive, insets, height }) {
  const { isSaved, onToggleSave, onShare, onReport } = useListingActions(item, {
    reportBackTo: '/(tabs)/home',
  });
  // Icon shows only for a USER-initiated pause — auto-pause of off-screen reels
  // while swiping must not flash a play icon.
  const [paused, setPaused] = useState(false);
  const player = useVideoPlayer(item.videoUrl, (player) => {
    player.loop = true;
    player.muted = true;
  });
  // The tab navigator keeps this feed mounted while other screens are pushed on
  // top, so each row's paused player would keep its video decoder alive. With
  // windowSize={3} that's up to 3 idle decoders under every pushed screen — add
  // the pushed screen's own players and the process runs out of memory (seen as
  // a MediaCodec OOM crash). Unload sources while unfocused, reload on return.
  const isFocused = useIsFocused();
  const unloadedRef = useRef(false);

  // 🔑 THIS is what actually starts video playback
  useEffect(() => {
    if (!isFocused) {
      unloadedRef.current = true;
      player.replaceAsync(null).catch(() => {});
      return;
    }
    const resume = () => {
      if (isActive) {
        player.play();
        setPaused(false);
      } else {
        player.pause();
      }
    };
    if (unloadedRef.current) {
      unloadedRef.current = false;
      player.replaceAsync(item.videoUrl).then(resume).catch(() => {});
    } else {
      resume();
    }
  }, [isActive, isFocused, player, item.videoUrl]);

  const togglePlay = () => {
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
      {/* 🎥 Video */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />

      <ListingReelOverlay
        item={item}
        bottom={insets.bottom + 92}
        isSaved={isSaved}
        onToggleSave={onToggleSave}
        onShare={onShare}
        onPressDetail={() => router.push(`/home/${item.id}`)}
        onPressReport={onReport}
        showMoreAction
        showShareAction
        showSaveAction
      />

      {/* Progress bar sits just above the floating tab bar (bottom: insets+10, h 56) */}
      <VideoReelControls
        player={player}
        paused={paused}
        bottomOffset={insets.bottom + 10 + 56 + 8}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  reel: {
    width: '100%',
    backgroundColor: 'black',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  searchScrim: {
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 15,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
