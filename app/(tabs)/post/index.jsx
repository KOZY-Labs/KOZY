import { router, useFocusEffect } from "expo-router";
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/ui/appText';
import EmptyListingsState from '@/components/ui/emptyListingsState';
import { useAuth } from '@/context/AuthContext';
import { useListingDraft } from '@/context/ListingDraftContext';
import { getMissingProfileFields, showProfileGate } from '@/lib/profileCompleteness';

// Tab bar visibility for post sub-screens is handled centrally in (tabs)/_layout.jsx.
export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, profile } = useAuth();
  const { editingId, resetDraft } = useListingDraft();

  // Landing back on the tab root means the edit flow was abandoned (tab switch, back).
  // Drop the loaded listing so starting a new post can't overwrite the edited one.
  useFocusEffect(
    useCallback(() => {
      if (editingId) resetDraft();
    }, [editingId, resetDraft])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppText variant="headline-sm" color="primary">Add New Listing</AppText>
         <EmptyListingsState
          heading="Let’s List Your Space"
          description="Just a few quick steps to share your room with the right people."
          actionText={isLoggedIn ? "Share a room" : "Sign Up / Log In"}
          onAction={() => {
            if (!isLoggedIn) {
              router.push('/(auth)/login');
              return;
            }
            // Posting requires a complete profile (everything except About Me).
            const missing = getMissingProfileFields(profile);
            if (missing.length) {
              showProfileGate({ missing, backTo: '/(tabs)/post' });
              return;
            }
            router.push('/(tabs)/post/stepOne');
          }}
          imageSource = {require('@/assets/images/3d-house.png')}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container :{
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 56,
    flexDirection: 'column',
  },
});