// Shared "Cancel" behavior for the post steps (stepOne..Four).
// Creating a new listing: pop back to the post tab root, leaving the draft in place so
// re-entering the flow keeps the values (existing behavior).
// Editing an existing listing: clear the loaded copy — otherwise the next new post would
// still carry `editingId` and overwrite the edited listing — and return where we came from.
import { useCallback } from 'react';
import { router } from 'expo-router';

import { showConfirmModal } from '@/components/ui/confirmModalHost';
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

  // Same shape as the Edit Profile discard prompt: safe option is the primary CTA.
  const confirmExit = useCallback(() => {
    showConfirmModal({
      title: 'Exit without saving?',
      message: 'Are you sure you want to exit? Your changes may not be saved.',
      primaryText: 'Stay',
      secondaryText: 'Exit without saving',
      onSecondary: exit,
    });
  }, [exit]);

  return { exit, confirmExit };
}
