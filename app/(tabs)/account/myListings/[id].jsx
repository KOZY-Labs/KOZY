import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, Pressable, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import AppIconButton from '@/components/ui/appIconButton';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { useListing } from '@/hooks/use-listings';

const { height } = Dimensions.get('window');

export default function MyList() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({
        tabBarStyle: { display: 'none' },
      });

      return () => {
        parent?.setOptions({
          tabBarStyle: {
            position: 'absolute',
            alignSelf: 'center',
            bottom: insets.bottom + 10,
            overflow: 'hidden',
            borderRadius: 16,
            borderTopWidth: 0,
            height: 56,
            maxWidth: 400,
            width: '100%',
            paddingTop: 7,
            marginHorizontal: 16,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 10,
          },
        });
      };
    }, [navigation, insets.bottom])
  );

  return (
    <View style={styles.container}>
      {/* 🔝 Top Bar */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <AppIconButton
          icon={<Feather name="arrow-left" size={32} />}
          type="ghost"
          size="lg"
          onPress={() => router.back()}
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
        bottom={insets.bottom + 20}
        onPressDetail={() => router.push(`/(tabs)/account/myListings/detail/${item.id}`)}
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
  bottomLeft: {
    position: 'absolute',
    left: 20,
    maxWidth: '70%',
  },
  bottomCTA: {
    marginTop: 12,
    width: 67,
  },
  username: {
    color: 'white',
    fontWeight: '600',
    marginBottom: 4,
  },
  question: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
});
