import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import EmptyListingsState from '@/components/ui/emptyListingsState';
import ResultVideoCard from '@/components/ui/resultVideoCard';
import { colors } from '@/constants/colors';

const SAVED_LISTINGS_KEY = 'savedListings';

export default function SavedList() {
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadSavedListings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_LISTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setListings(parsed);
    } catch (_error) {
      setListings([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedListings();
    }, [loadSavedListings])
  );

  const toggleEdit = () => {
    setIsEditMode((prev) => !prev);
  };

  const handleRequestDelete = (listing) => {
    Alert.alert(
      'Delete Saved Listing',
      `Remove ${listing.title ?? 'this listing'} from your saved listings?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const nextListings = listings.filter((item) => item.id !== listing.id);

            try {
              await AsyncStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify(nextListings));
              setListings(nextListings);
            } catch (_error) {
              Alert.alert('Delete Failed', 'Unable to delete saved listing. Please try again.');
            }
          },
        },
      ]
    );
  };

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
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 84 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {listings.map((item) => {
            return (
              <ResultVideoCard
                key={item.id}
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
            );
          })}
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
