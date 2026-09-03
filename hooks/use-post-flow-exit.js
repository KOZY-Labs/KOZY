// Shared "Cancel" behavior for the post steps (stepOne..Four).
// Exiting is a deliberate "start over" (confirmed via the exit modal), so the draft is
// cleared in every case — re-entering the flow starts blank. Going BACK through steps
// (header back) is not an exit and keeps the draft as-is.
// Editing an existing listing additionally must drop `editingId` — otherwise the next
// new post would overwrite the edited listing — and returns where we came from.
import { useCallback } from 'react';
import { router } from 'expo-router';

import { showConfirmModal } from '@/components/ui/confirmModalHost';
import { useListingDraft } from '@/context/ListingDraftContext';

export function usePostFlowExit() {
  const { editingId, returnTo, resetDraft } = useListingDraft();

  const exit = useCallback(() => {
    resetDraft();
    if (editingId) {
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
