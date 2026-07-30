// Shared "Cancel" behavior for the post steps (stepOne..Four).
// Creating a new listing: pop back to the post tab root, leaving the draft in place so
// re-entering the flow keeps the values (existing behavior).
// Editing an existing listing: clear the loaded copy — otherwise the next new post would
// still carry `editingId` and overwrite the edited listing — and return where we came from.
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { useListingDraft } from '@/context/ListingDraftContext';

export function usePostFlowExit() {
  const { editingId, returnTo, resetDraft } = useListingDraft();

  const exit = useCallback(() => {
    if (editingId) {
      resetDraft();
      router.replace(returnTo ?? '/(tabs)/account/myListings');
      return;
    }
    router.dismissTo('/(tabs)/post');
  }, [editingId, returnTo, resetDraft]);

  const confirmExit = useCallback(() => {
    Alert.alert(
      'Exit without saving?',
      'Are you sure you want to exit? Your changes may not be saved.',
      [
        { text: 'Stay' },
        { text: 'Exit without saving', style: 'destructive', onPress: exit },
      ]
    );
  }, [exit]);

  return { exit, confirmExit };
}
