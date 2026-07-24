import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Share, Pressable, ActivityIndicator, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppIconButton from '@/components/ui/appIconButton';
import { useListing } from '@/hooks/use-listings';
import { useAuth } from '@/context/AuthContext';
import { showAuthGate } from '@/lib/authGate';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';

const { height } = Dimensions.get('window');

// Tab bar visibility for the search flow is handled centrally in (tabs)/_layout.jsx.
export default function SearchResultListItem() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: item, loading } = useListing(id);

  const handleBack = () => {
    // Pop the stack so back always slides left-to-right and returns to whichever screen
    // pushed this one (search page or results list) with its state intact.
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // No history (deep link) — rebuild the most sensible screen.
    if (getParamString(params.from) === 'search') {
      router.replace('/home/search');
      return;
    }
    router.replace({
      pathname: '/home/search/searchResult',
      params: {
        location: getParamString(params.location),
        budgetFrom: getParamString(params.budgetFrom),
        budgetTo: getParamString(params.budgetTo),
        gender: getParamString(params.gender),
        roomTypes: getParamString(params.roomTypes),
        lifestyleMatches: getParamString(params.lifestyleMatches),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* 🔝 Top Bar */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <AppIconButton
          icon={<Feather name="arrow-left" size={32} />}
          type="ghost"
          size="lg"
          onPress={handleBack}
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
        <Reel item={item} insets={insets} params={params} />
      )}
    </View>
  );
}

function Reel({ item, insets, params }) {
  const { isLoggedIn } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  const loadSavedState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('savedListings');
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
    if (!isLoggedIn) {
      showAuthGate({
        title: 'Save it for later',
        message: 'Sign Up or Log In to keep track of places you like.',
      });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem('savedListings');
      const parsed = stored ? JSON.parse(stored) : [];
      const exists = parsed.some((saved) => saved.id === item.id);
      const next = exists
        ? parsed.filter((saved) => saved.id !== item.id)
        : [item, ...parsed];

      await AsyncStorage.setItem('savedListings', JSON.stringify(next));
      setIsSaved(!exists);
    } catch {
      // noop
    }
  }, [item, isLoggedIn]);

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

  const onReport = useCallback(() => {
    if (!isLoggedIn) {
      showAuthGate({
        title: 'Report this listing',
        message: 'Sign Up or Log In to report listings.',
      });
      return;
    }
    router.push({
      pathname: '/(tabs)/account/contactUs',
      params: { backTo: '/(tabs)/home/search' },
    });
  }, [isLoggedIn]);

  return (
    <Pressable style={styles.reel} onPress={toggleMute}>
      {/* 🎥 Video */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        pointerEvents="none"
      />

      <ListingReelOverlay
        item={item}
        bottom={insets.bottom + 12}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
        onShare={onShare}
        onPressDetail={() => router.push({
          pathname: '/home/[id]',
          params: {
            id: item.id,
            backTo: JSON.stringify({
              pathname: '/home/search/[id]',
              params: {
                id: item.id,
                from: getParamString(params.from),
                location: getParamString(params.location),
                budgetFrom: getParamString(params.budgetFrom),
                budgetTo: getParamString(params.budgetTo),
                gender: getParamString(params.gender),
                roomTypes: getParamString(params.roomTypes),
                lifestyleMatches: getParamString(params.lifestyleMatches),
              },
            }),
          },
        })}
        onPressReport={onReport}
        showMoreAction
        showShareAction
        showSaveAction
      />
    </Pressable>
  );
}

function getParamString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
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
