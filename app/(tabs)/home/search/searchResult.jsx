import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/ui/appText';
import ResultVideoCard from '@/components/ui/resultVideoCard';
import { colors } from '@/constants/colors';
import { useBrowseListings } from '@/hooks/use-listings';
import { filterListings } from '@/lib/listingFilters';

export default function SearchResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: listings } = useBrowseListings();

  const roomTypes = useMemo(() => parseParamArray(params.roomTypes), [params.roomTypes]);
  const lifestyleMatches = useMemo(
    () => parseParamArray(params.lifestyleMatches),
    [params.lifestyleMatches]
  );

  const results = useMemo(
    () =>
      filterListings(listings, {
        location: getParamString(params.location),
        budgetFrom: getParamString(params.budgetFrom),
        budgetTo: getParamString(params.budgetTo),
        gender: getParamString(params.gender),
        roomTypes,
        lifestyleMatches,
      }),
    [listings, lifestyleMatches, params.budgetFrom, params.budgetTo, params.gender, params.location, roomTypes]
  );

  const handlePressListing = (id) => {
    router.push({
      pathname: '/home/search/[id]',
      params: {
        id,
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 16) + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summary}>
        <AppText variant="body-xsm" color="placeholder">
          {results.length} {results.length === 1 ? 'listing' : 'listings'} found
        </AppText>
      </View>

      {results.length > 0 ? (
        <View style={styles.grid}>
          {results.map((item) => (
            <ResultVideoCard
              key={item.id}
              item={item}
              onPress={() => handlePressListing(item.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyResults}>
          <AppText variant="body-sm" color="placeholder" style={styles.emptyResultsText}>
            No listings match these filters.
          </AppText>
        </View>
      )}
    </ScrollView>
  );
}

function parseParamArray(value) {
  const stringValue = getParamString(value);
  if (!stringValue) return [];

  try {
    const parsed = JSON.parse(stringValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getParamString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.base.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  summary: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyResults: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResultsText: {
    textAlign: 'center',
  },
});
