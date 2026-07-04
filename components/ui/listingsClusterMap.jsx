// Reusable interactive Google map with supercluster-based marker clustering.
// Used by the search screen's inline preview and the full-screen map route.
// Zoomed out → count badges; zoom in → Airbnb-style price pills.
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Supercluster from 'supercluster';
import { Feather } from '@expo/vector-icons';

import AppText from '@/components/ui/appText';
import { colors } from '@/constants/colors';
import { boundingRegion, regionToZoom, regionToBBox } from '@/lib/geo/mapRegion';

const MAX_ZOOM = 18;
const formatPrice = (price) => `$${Number(price ?? 0).toLocaleString()}`;

export default function ListingsClusterMap({
  listings, // pre-filtered listings that all have coordinates
  style, // container style (size the map through this)
  centerRegion = null, // externally requested center (e.g. a picked address) — animates on change
  selectedId = null, // listing id to render as the selected (dark) pill
  onPressListing, // (listing) => void
  onPressMap, // () => void — real map taps only (marker taps are filtered out)
  onRegionChange, // (region) => void — reports the latest region (e.g. to hand off to the full map)
  showZoomControls = true,
  zoomControlsOffset = 16, // distance from the bottom edge
}) {
  const mapRef = useRef(null);
  // Initial camera only — afterwards the map is user-driven (we animate, never force).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialRegion = useMemo(() => centerRegion ?? boundingRegion(listings), []);
  const regionRef = useRef(initialRegion);
  const fittedRef = useRef(false);
  const [clusters, setClusters] = useState([]);

  // Cluster index — rebuilt only when the listing set changes (filters, data load).
  const index = useMemo(() => {
    const points = listings.map((item) => ({
      type: 'Feature',
      properties: { cluster: false, listing: item },
      geometry: {
        type: 'Point',
        coordinates: [Number(item.longitude), Number(item.latitude)],
      },
    }));
    return new Supercluster({ radius: 60, maxZoom: MAX_ZOOM }).load(points);
  }, [listings]);

  const recompute = useCallback(
    (region) => {
      regionRef.current = region;
      setClusters(index.getClusters(regionToBBox(region), regionToZoom(region, MAX_ZOOM)));
      onRegionChange?.(region);
    },
    [index, onRegionChange]
  );

  // Whenever the listing set changes (data arrives / filters change), re-cluster the
  // current viewport. Fit-to-listings only once, and only when no external center is set.
  useEffect(() => {
    if (!fittedRef.current && listings.length > 0 && !centerRegion) {
      fittedRef.current = true;
      const region = boundingRegion(listings);
      regionRef.current = region;
      mapRef.current?.animateToRegion(region, 300);
    }
    recompute(regionRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, recompute]);

  // Animate to an externally requested center (e.g. the user picked an address).
  useEffect(() => {
    if (centerRegion?.latitude != null && centerRegion?.longitude != null) {
      mapRef.current?.animateToRegion(centerRegion, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRegion?.latitude, centerRegion?.longitude]);

  const handleClusterPress = (cluster) => {
    const [longitude, latitude] = cluster.geometry.coordinates;
    const expansionZoom = Math.min(
      index.getClusterExpansionZoom(cluster.properties.cluster_id) + 0.5,
      MAX_ZOOM
    );
    const delta = 360 / 2 ** expansionZoom;
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta },
      350
    );
  };

  // Custom +/- zoom controls — iOS Google Maps has no built-in zoom buttons.
  const zoomBy = (factor) => {
    const r = regionRef.current;
    if (!r) return;
    const clampDelta = (d) => Math.min(Math.max(d * factor, 0.002), 140);
    mapRef.current?.animateToRegion(
      { ...r, latitudeDelta: clampDelta(r.latitudeDelta), longitudeDelta: clampDelta(r.longitudeDelta) },
      200
    );
  };

  return (
    <View style={style}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={recompute}
        // Google Maps (iOS) fires the map's onPress for marker taps too; only forward
        // real map taps or a selection would clear the instant it's made.
        onPress={(e) => {
          if (e?.nativeEvent?.action !== 'marker-press') onPressMap?.();
        }}
        showsPointsOfInterest={false}
        zoomControlsEnabled={false}
      >
        {clusters.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;

          if (feature.properties.cluster) {
            return (
              <Marker
                key={`cluster-${feature.properties.cluster_id}`}
                coordinate={{ latitude, longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  handleClusterPress(feature);
                }}
              >
                <View style={styles.clusterBadge}>
                  <AppText variant="body-sm-strong" style={styles.clusterText}>
                    {feature.properties.point_count}
                  </AppText>
                </View>
              </Marker>
            );
          }

          const listing = feature.properties.listing;
          const isSelected = selectedId != null && selectedId === listing.id;
          return (
            <Marker
              key={`listing-${listing.id}`}
              coordinate={{ latitude, longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={(e) => {
                e?.stopPropagation?.();
                onPressListing?.(listing);
              }}
            >
              <View style={[styles.pricePill, isSelected && styles.pricePillSelected]}>
                <AppText
                  variant="body-sm-strong"
                  style={isSelected ? styles.pricePillTextSelected : styles.pricePillText}
                >
                  {formatPrice(listing.price)}
                </AppText>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {showZoomControls && (
        <View style={[styles.zoomControls, { bottom: zoomControlsOffset }]}>
          <Pressable
            style={styles.zoomButton}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            onPress={() => zoomBy(0.5)}
          >
            <Feather name="plus" size={20} color={colors.base.background} />
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            style={styles.zoomButton}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            onPress={() => zoomBy(2)}
          >
            <Feather name="minus" size={20} color={colors.base.background} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clusterBadge: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: colors.base.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.base.white,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  clusterText: {
    color: colors.base.white,
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.base.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pricePillSelected: {
    backgroundColor: colors.base.background,
  },
  pricePillText: {
    color: colors.base.background,
  },
  pricePillTextSelected: {
    color: colors.base.white,
  },
  zoomControls: {
    position: 'absolute',
    right: 12,
    backgroundColor: colors.base.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  zoomButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
});
