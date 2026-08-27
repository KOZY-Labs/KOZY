import { ActivityIndicator, Pressable, StyleSheet, View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import EmptyListingsState from '@/components/ui/emptyListingsState';
import ResultVideoCard from '@/components/ui/resultVideoCard';
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import { colors } from '@/constants/colors';
import { subscribeSavedListingIds, unsaveListing } from '@/lib/db/savedListings';
import { getListing } from '@/lib/db/listings';
import { useAuth } from '@/context/AuthContext';


export default function SavedList() {
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const [savedIds, setSavedIds] = useState(null); // null until the subscription delivers
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Saved ids live in users/{uid}/savedListings — saves/unsaves anywhere reflect here.
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeSavedListingIds(uid, setSavedIds);
  }, [uid]);

  // Resolve ids to live listing docs. The listings state doubles as the cache: items we
  // already hold are reused, so an unsave just filters locally with zero reads.
  useEffect(() => {
    if (savedIds == null) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const next = await Promise.all(
          savedIds.map(
            (id) =>
              listings.find((l) => l.id === id) ?? getListing(id).catch(() => null)
          )
        );
        // Drop listings that were deleted since being saved.
        if (!cancelled) setListings(next.filter(Boolean));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `listings` is the cache being written, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds]);

  const toggleEdit = () => {
    setIsEditMode((prev) => !prev);
  };

  const handleRequestDelete = (listing) => {
    showConfirmModal({
      title: 'Delete Saved Listing',
      message: `Remove ${listing.title ?? 'this listing'} from your saved listings?`,
      primaryText: 'Delete',
      secondaryText: 'Cancel',
      onPrimary: async () => {
        try {
          await unsaveListing(uid, listing.id);
        } catch (_error) {
          showAlertModal({ title: 'Delete Failed', message: 'Unable to delete saved listing. Please try again.' });
        }
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyListingsState
          heading="Nothing saved yet"
          description="Start exploring and save places you like."
          actionText="Explore more"
          onAction={() => router.push('/(tabs)/home')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <AppText variant="body-xsm" color="primary" style={{flexGrow: 1}}>
          Total {listings.length} {listings.length === 1 ? 'Saved Listing' : 'Saved Listings'}
        </AppText>
        {!isEditMode && (
          <AppButton
            text="Edit Listings"
            size="sm"
            type="secondary"
            onPress={toggleEdit}
            style={styles.editButton}
          />
        )}
        {isEditMode && (
          <AppButton
            text="Done"
            size="sm"
            type="secondary"
            style={styles.actionButton}
            onPress={toggleEdit}
          />
        )}
      </View>
      {/* Windowed: each card mounts an autoplaying video player — never all at once. */}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 84 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews
        renderItem={({ item }) => (
          <ResultVideoCard
            item={item}
            onPress={() => {
              if (isEditMode) {
                return;
              }

              router.push(`account/savedList/${item.id}`);
            }}
            accessibilityLabel={
              isEditMode ? `Saved listing ${item.title}` : `Open saved listing ${item.title}`
            }
            accessory={
              isEditMode ? (
                <Pressable
                  onPress={() => handleRequestDelete(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete saved listing ${item.title}`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.trashButton,
                    pressed && styles.trashButtonPressed,
                  ]}
                >
                  <Feather name="trash" size={20} color={colors.base.bodyInverted} />
                </Pressable>
              ) : null
            }
          />
        )}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base.background,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  editButton: {
    width: 104,
  },
  actionButton: {
    width: 74,
  },
  listContent: {
    paddingTop: 4,
  },
  gridRow: {
    gap: 12,
  },
  trashButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.base.gray800Alpha,
    borderWidth: 1,
    borderColor: colors.base.white300Alpha,
  },
  trashButtonPressed: {
    opacity: 0.75,
  },
});
