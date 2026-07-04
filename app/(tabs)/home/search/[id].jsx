import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Share, Pressable, ActivityIndicator, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from 'react-native-elements';

import AppIconButton from '@/components/ui/appIconButton';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import { useListing } from '@/hooks/use-listings';
import { colors } from '@/constants/colors';

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
  const [isSaved, setIsSaved] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  return (
    <Pressable style={styles.reel} onPress={toggleMute}>
      {/* 🎥 Video */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        pointerEvents="none"
      />

      {/* Right Actions */}
      <View style={[styles.rightActions, { bottom: insets.bottom + 92 }]}>
        <AppIconButton
          icon={<MaterialIcons name={isSaved ? 'favorite' : 'favorite-border'} />}
          type="bare"
          onPress={handleToggleSave}
        />
        <AppIconButton icon={<Feather name="share-2" />} type="bare" onPress={onShare} />
        <AppIconButton icon={<Feather name="more-horizontal" />} type="bare" onPress={toggleDropdown} />
        {isDropdownOpen && (
          <Pressable
            style={styles.rightActionsdDropdown}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/account/contactUs',
                params: { backTo: '/(tabs)/home/search' },
              })
            }
          >
            <AppText variant="caption" color="error">Report</AppText>
          </Pressable>
        )}
      </View>

      {/* Bottom Left */}
      <View style={[styles.bottomLeft, { bottom: insets.bottom + 92 }]}>
        <View style={styles.bottomRoomInfo}>
          <Avatar
            source={{ uri: item.owner?.avatar?.[0] }}
            size={44}
            rounded
            containerStyle={{ backgroundColor: 'gray' }}
          />
          <View style={styles.bottomInfo}>
            <AppText variant="body-sm-strong">{item.title}</AppText>
            <AppText variant="body-sm">${item.price} / month</AppText>
          </View>
          <View style={styles.bottomCTA}>
            <AppButton
              text="Detail"
              size="sm"
              type="primary"
              onPress={() => router.push({
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
            />
          </View>
        </View>
        <AppText variant="body-sm-strong" numberOfLines={2}>
          #{item.city} #{item.province}
        </AppText>
      </View>
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
  bottomLeft: {
    position: 'absolute',
    left: 20,
    maxWidth: '80%',
  },
  bottomCTA: {
    width: 67,
  },
  rightActions: {
    position: 'absolute',
    right: 20,
    gap: 22,
    alignItems: 'center',
  },
  rightActionsdDropdown: {
    width: 200,
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: colors.base.gray700,
    padding: 12,
    borderRadius: 10,
    zIndex: 200,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomRoomInfo: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
});
