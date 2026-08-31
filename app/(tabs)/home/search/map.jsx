import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/ui/appText';
import ListingsAreaSheet from '@/components/ui/drawer/ListingsAreaSheet';
import ListingsClusterMap from '@/components/ui/listingsClusterMap';
import { colors } from '@/constants/colors';
import { useBrowseListings } from '@/hooks/use-listings';
import { filterWithCoordinates } from '@/lib/geo/mapRegion';
import { filterListings } from '@/lib/listingFilters';

// Full-screen clustered map. Inherits the search screen's filters and the preview
// map's position via route params, so it opens exactly where the user left off.
export default function SearchMapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: listings, loading } = useBrowseListings();
  const areaSheetRef = useRef(null);

  // Listings behind the last-tapped map marker (single pin or grouped cluster).
  const [areaListings, setAreaListings] = useState([]);

  const mapListings = useMemo(
    () =>
      filterListings(filterWithCoordinates(listings), {
        location: getParamString(params.location),
        budgetFrom: getParamString(params.budgetFrom),
        budgetTo: getParamString(params.budgetTo),
        gender: getParamString(params.gender),
        roomTypes: parseParamArray(params.roomTypes),
        lifestyleMatches: parseParamArray(params.lifestyleMatches),
      }),
    [listings, params.location, params.budgetFrom, params.budgetTo, params.gender, params.roomTypes, params.lifestyleMatches]
  );

  // Open at the position the preview map was showing (when provided).
  const centerRegion = useMemo(() => {
    const latitude = Number(getParamString(params.centerLat));
    const longitude = Number(getParamString(params.centerLng));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const latDelta = Number(getParamString(params.latDelta));
    const lngDelta = Number(getParamString(params.lngDelta));
    return {
      latitude,
      longitude,
      latitudeDelta: Number.isFinite(latDelta) && latDelta > 0 ? latDelta : 0.05,
      longitudeDelta: Number.isFinite(lngDelta) && lngDelta > 0 ? lngDelta : 0.05,
    };
  }, [params.centerLat, params.centerLng, params.latDelta, params.lngDelta]);

  // A single listing skips the sheet and opens directly.
  const handleOpenArea = (items) => {
    if (items.length === 0) return;
    if (items.length === 1) {
      handleOpenListing(items[0]);
      return;
    }
    setAreaListings(items);
    areaSheetRef.current?.snapToIndex(0);
  };

  const handleOpenListing = (listing) => {
    areaSheetRef.current?.close();
    // Land on the video reel first (same as the inline search map) — the reel's
    // Detail button takes it from there. Back pops the stack, returning here.
    router.push({
      pathname: '/home/search/[id]',
      params: { id: listing.id },
    });
  };

  return (
    <View style={styles.container}>
      <ListingsClusterMap
        listings={mapListings}
        style={StyleSheet.absoluteFill}
        centerRegion={centerRegion}
        onPressListing={(listing) => handleOpenArea([listing])}
        onPressCluster={handleOpenArea}
        onPressMap={() => areaSheetRef.current?.close()}
        showZoomControls
        zoomControlsOffset={Math.max(insets.bottom, 16) + 16}
      />

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.base.white} />
        </View>
      )}

      {!loading && mapListings.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <AppText variant="body-sm" style={styles.emptyText}>
            No listings match these filters.
          </AppText>
        </View>
      )}

      <ListingsAreaSheet
        ref={areaSheetRef}
        listings={areaListings}
        onPressListing={handleOpenListing}
        onClose={() => setAreaListings([])}
      />
    </View>
  );
}

function getParamString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.base.white,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
