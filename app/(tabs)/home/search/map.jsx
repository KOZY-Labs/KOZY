import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import AppText from '@/components/ui/appText';
import ListingsClusterMap from '@/components/ui/listingsClusterMap';
import { colors } from '@/constants/colors';
import { useListings } from '@/hooks/use-listings';
import { filterWithCoordinates } from '@/lib/geo/mapRegion';
import { filterListings } from '@/lib/listingFilters';

const formatPrice = (price) => `$${Number(price ?? 0).toLocaleString()}`;

// Full-screen clustered map. Inherits the search screen's filters and the preview
// map's position via route params, so it opens exactly where the user left off.
export default function SearchMapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: listings, loading } = useListings();
  const [selected, setSelected] = useState(null); // listing shown in the bottom card

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

  return (
    <View style={styles.container}>
      <ListingsClusterMap
        listings={mapListings}
        style={StyleSheet.absoluteFill}
        centerRegion={centerRegion}
        selectedId={selected?.id ?? null}
        onPressListing={setSelected}
        onPressMap={() => setSelected(null)}
        showZoomControls
        zoomControlsOffset={Math.max(insets.bottom, 16) + 120}
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

      {/* Airbnb-style bottom listing card */}
      {selected && (
        <Pressable
          style={[styles.card, { bottom: Math.max(insets.bottom, 16) + 8 }]}
          accessibilityRole="button"
          accessibilityLabel={`Open listing ${selected.title}`}
          onPress={() =>
            router.push({
              pathname: '/home/[id]',
              params: { id: selected.id, backTo: '/home/search/map' },
            })
          }
        >
          <Image
            source={{ uri: selected.images?.[0] }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardInfo}>
            <AppText variant="body-sm-strong" numberOfLines={1} style={styles.cardTitle}>
              {selected.title}
            </AppText>
            <AppText variant="body-xsm" numberOfLines={1} style={styles.cardSubtitle}>
              {selected.city}{selected.province ? `, ${selected.province}` : ''}
            </AppText>
            <AppText variant="body-sm-strong" style={styles.cardPrice}>
              {formatPrice(selected.price)} / month
            </AppText>
          </View>
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close listing card"
            onPress={() => setSelected(null)}
            style={styles.cardClose}
          >
            <Feather name="x" size={18} color={colors.base.background} />
          </Pressable>
        </Pressable>
      )}
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
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: colors.base.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardImage: {
    width: 96,
    height: 96,
    backgroundColor: '#e5e5e5',
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 2,
  },
  cardTitle: {
    color: colors.base.background,
  },
  cardSubtitle: {
    color: '#666',
  },
  cardPrice: {
    color: colors.base.background,
    marginTop: 4,
  },
  cardClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
