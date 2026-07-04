import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Share, Pressable, ActivityIndicator, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppIconButton from '@/components/ui/appIconButton';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { useListing } from '@/hooks/use-listings';

const { height } = Dimensions.get('window');
const SAVED_LISTINGS_KEY = 'savedListings';

export default function SavedList() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });

      return () => {
        parent?.setOptions({
          tabBarStyle: {
            position: 'absolute',
            alignSelf: 'center',
            bottom: insets.bottom + 10,
            borderRadius: 16,
            borderTopWidth: 0,
            height: 56,
            backgroundColor: 'rgba(0,0,0,1)',
            maxWidth: 400,
            paddingTop: 7,
            marginHorizontal: 16,
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
  const [isSaved, setIsSaved] = useState(false);

  const loadSavedState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_LISTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setIsSaved(parsed.some((saved) => saved.id === item.id));
    } catch {
      setIsSaved(false);
    }
  }, [item.id]);

  useFocusEffect(
    useCallback(() => {
      loadSavedState();
    }, [loadSavedState])
  );

  const handleToggleSave = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_LISTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const exists = parsed.some((saved) => saved.id === item.id);
      const next = exists
        ? parsed.filter((saved) => saved.id !== item.id)
        : [item, ...parsed];

      await AsyncStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify(next));
      setIsSaved(!exists);
      router.back();
    } catch {
      // noop
    }
  }, [item]);

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
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
        onShare={onShare}
        onPressDetail={() => router.push(`/(tabs)/account/savedList/detail/${item.id}`)}
        showRepeatAction
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
