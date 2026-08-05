import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import EmptyListingsState from '@/components/ui/emptyListingsState';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import ResultVideoCard from '@/components/ui/resultVideoCard';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useMyListings } from '@/hooks/use-listings';
import { deleteListing } from '@/lib/db/listings';
import { getMissingProfileFields, showProfileGate } from '@/lib/profileCompleteness';
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';

export default function MyListings() {
  const insets = useSafeAreaInsets();
  const { uid, profile } = useAuth();
  const { data: listings, loading, reload } = useMyListings(uid);
  const [isEditMode, setIsEditMode] = useState(false);

  // Same gate as the Post tab — this empty state is another entry into the post flow.
  const startNewPost = () => {
    const missing = getMissingProfileFields(profile);
    if (missing.length) {
      showProfileGate({ missing, backTo: '/(tabs)/account/myListings' });
      return;
    }
    router.push('/(tabs)/post/stepOne');
  };

  const toggleEdit = () => {
    setIsEditMode((prev) => !prev);
  };

  const handleRequestDelete = (listing) => {
    showConfirmModal({
      title: 'Delete Listing',
      message: `Are you sure you want to delete ${listing.title ?? 'this listing'}?`,
      primaryText: 'Delete',
      secondaryText: 'Cancel',
      onPrimary: async () => {
        try {
          await deleteListing(listing.id);
          reload();
        } catch (e) {
          showAlertModal({ title: 'Delete failed', message: e?.message ?? 'Please try again.' });
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
          heading="Have a room to share?"
          description="List it and connect with verified seekers."
          actionText="Share a room"
          onAction={startNewPost}
          imageSource = {require('@/assets/images/3d-house.png')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <AppText variant="body-xsm" color="primary" style={styles.countText}>
          Total {listings.length} {listings.length === 1 ? 'Listing' : 'Listings'}
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
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 84 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {listings.map((item) => (
            <ResultVideoCard
              key={item.id}
              item={item}
              onPress={() => {
                if (isEditMode) {
                  return;
                }

                router.push(`account/myListings/${item.id}`);
              }}
              accessibilityLabel={
                isEditMode ? `My listing ${item.title}` : `Open my listing ${item.title}`
              }
              accessory={
                isEditMode ? (
                  <Pressable
                    onPress={() => handleRequestDelete(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete listing ${item.title}`}
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
          ))}
        </View>
      </ScrollView>
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
  countText: {
    flexGrow: 1,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
