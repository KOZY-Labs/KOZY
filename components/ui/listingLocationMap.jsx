// Listing location map used on detail screens.
// Renders the small static preview; tapping it opens a full-screen interactive map
// (like the search map) that shows ONLY this listing's pin — points of interest stay
// visible so the viewer can see what's around the area.
import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

const FALLBACK_REGION = { latitude: 49.2827, longitude: -123.1207 }; // Vancouver

export default function ListingLocationMap({ latitude, longitude, style }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef(null);
  const regionRef = useRef(null);

  const coordinate = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    return {
      latitude: Number.isFinite(lat) ? lat : FALLBACK_REGION.latitude,
      longitude: Number.isFinite(lng) ? lng : FALLBACK_REGION.longitude,
    };
  }, [latitude, longitude]);

  const previewRegion = { ...coordinate, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  const fullRegion = { ...coordinate, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  // Custom +/- zoom controls — iOS Google Maps has no built-in zoom buttons.
  const zoomBy = (factor) => {
    const r = regionRef.current ?? fullRegion;
    const clampDelta = (d) => Math.min(Math.max(d * factor, 0.002), 140);
    mapRef.current?.animateToRegion(
      { ...r, latitudeDelta: clampDelta(r.latitudeDelta), longitudeDelta: clampDelta(r.longitudeDelta) },
      200
    );
  };

  return (
    <>
      <Pressable
        style={[styles.previewContainer, style]}
        onPress={() => setExpanded(true)}
        accessibilityRole="button"
        accessibilityLabel="Open full-screen map of the listing location"
      >
        {/* Static location preview — tap to expand */}
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          region={previewRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
          <Marker coordinate={coordinate} />
        </MapView>
        <View style={styles.expandHint} pointerEvents="none">
          <Feather name="maximize-2" size={14} color={colors.base.background} />
        </View>
      </Pressable>

      <Modal
        visible={expanded}
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.fullContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={fullRegion}
            onRegionChangeComplete={(region) => {
              regionRef.current = region;
            }}
          >
            <Marker coordinate={coordinate} />
          </MapView>

          <Pressable
            style={[styles.closeButton, { top: insets.top + 12 }]}
            onPress={() => setExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel="Close map"
            hitSlop={10}
          >
            <Feather name="x" size={20} color={colors.base.background} />
          </Pressable>

          <View style={[styles.zoomControls, { bottom: Math.max(insets.bottom, 16) + 16 }]}>
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
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
  },
  expandHint: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.base.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  fullContainer: {
    flex: 1,
    backgroundColor: colors.base.background,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.base.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
