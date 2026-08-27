import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { showAlertModal } from '@/components/ui/confirmModalHost';
import { useListingDraft } from '@/context/ListingDraftContext';
import { useListing } from '@/hooks/use-listings';

// Entry point for "Edit Listing". Loads the saved listing into the shared draft, then
// replaces itself with step 1 so the existing multi-step flow edits it in place.
// Params: id (listing id), backTo (screen to return to on cancel/save).
export default function EditListing() {
  const { id, backTo } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const returnTo = Array.isArray(backTo) ? backTo[0] : backTo;
  const { data: listing, loading } = useListing(listingId);
  const { startEdit } = useListingDraft();
  // The hand-off must run once — this screen stays mounted until the replace lands.
  const handled = useRef(false);

  useEffect(() => {
    if (loading || handled.current) return;
    handled.current = true;

    if (!listing) {
      // Navigate FIRST, then alert: the modal host is global, so the message survives
      // navigation — while relying on the alert's button would strand the user on this
      // headerless spinner if they dismissed via the backdrop instead.
      router.back();
      showAlertModal({
        title: 'Listing unavailable',
        message: 'We could not load this listing. Please try again.',
      });
      return;
    }

    startEdit(listing, returnTo ?? null);
    router.replace('/(tabs)/post/stepOne');
  }, [loading, listing, returnTo, startEdit]);

  return (
    <View style={styles.center} accessibilityLabel="Loading your listing">
      <ActivityIndicator color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
});
