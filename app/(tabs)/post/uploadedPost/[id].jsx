import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Share, Pressable, ActivityIndicator, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import AppIconButton from '@/components/ui/appIconButton';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { useListing } from '@/hooks/use-listings';

const { height } = Dimensions.get('window');

// Tab bar visibility for post sub-screens is handled centrally in (tabs)/_layout.jsx.
export default function UploadedPost() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);

  return (
    <View style={styles.container}>
      {/* 🔝 Top Bar */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <AppIconButton
          icon={<Feather name="arrow-left" size={32} />}
          type="ghost"
          size="lg"
          onPress={() => router.dismissTo('/(tabs)/post')}
        />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : !item ? (
        <View style={styles.center}>
          <Text style={{ color: '#fff' }}>Listing not found</Text>
        </View>
      ) : (
        <Reel item={item} insets={insets} />
      )}
    </View>
  );
}

function Reel({ item, insets }) {
  const player = useVideoPlayer(item.videoUrl ?? null, (p) => {
    if (!p) return;
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    player?.play();
  }, [player]);

  const toggleMute = () => {
    if (player) player.muted = !player.muted;
  };

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
    <Pressable style={styles.reel} onPress={toggleMute}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        pointerEvents="none"
      />
      <ListingReelOverlay
        item={item}
        bottom={insets.bottom}
        onShare={onShare}
        onPressDetail={() => router.push(`/(tabs)/post/uploadedPost/detail/${item.id}`)}
        showMoreAction
        showShareAction
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
    height,
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
