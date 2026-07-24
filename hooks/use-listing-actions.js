import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { showAuthGate } from '@/lib/authGate';

const SAVED_LISTINGS_KEY = 'savedListings';

// Shared save/share/report behavior for listing detail screens (home, saved, my listings).
export function useListingActions(item, { reportBackTo } = {}) {
  const { isLoggedIn } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  const loadSavedState = useCallback(async () => {
    if (!item?.id) return;
    try {
      const stored = await AsyncStorage.getItem(SAVED_LISTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setIsSaved(parsed.some((saved) => saved.id === item.id));
    } catch {
      setIsSaved(false);
    }
  }, [item?.id]);

  useFocusEffect(
    useCallback(() => {
      loadSavedState();
    }, [loadSavedState])
  );

  const onToggleSave = useCallback(async () => {
    if (!isLoggedIn) {
      showAuthGate({
        title: 'Save it for later',
        message: 'Sign Up or Log In to keep track of places you like.',
      });
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(SAVED_LISTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const exists = parsed.some((saved) => saved.id === item.id);
      const next = exists
        ? parsed.filter((saved) => saved.id !== item.id)
        : [item, ...parsed];

      await AsyncStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify(next));
      setIsSaved(!exists);
    } catch {
      // noop
    }
  }, [item, isLoggedIn]);

  const onShare = useCallback(async () => {
    try {
      await Share.share({
        message: 'Check this out! 👀',
        url: 'https://example.com',
        title: 'Share link',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, []);

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
      params: { backTo: reportBackTo },
    });
  }, [isLoggedIn, reportBackTo]);

  return { isSaved, onToggleSave, onShare, onReport };
}
