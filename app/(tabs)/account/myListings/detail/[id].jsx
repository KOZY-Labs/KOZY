import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, Image, Dimensions, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useListing } from '@/hooks/use-listings';
import DisplayField from '@/components/ui/displayField';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import ProfileSection from '@/components/ui/profileSection';
import ListingDetailHeaderActions from '@/components/ui/listingDetailHeaderActions';
import { useListingActions } from '@/hooks/use-listing-actions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MyPostDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);
  const [activeIndex, setActiveIndex] = useState(0);
  const { isSaved, onToggleSave, onShare, onReport } = useListingActions(item, {
    reportBackTo: '/(tabs)/account/myListings',
  });

  const defaultRegion = useMemo(() => {
    const initialLatitude = Number(item?.latitude);
    const initialLongitude = Number(item?.longitude);
    return {
      latitude: Number.isFinite(initialLatitude) ? initialLatitude : 49.2827,
      longitude: Number.isFinite(initialLongitude) ? initialLongitude : -123.1207,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [item]);

  // Tab bar visibility is handled centrally in (tabs)/_layout.jsx.

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff' }}>Item not found</Text>
      </View>
    );
  }

  const images = item.images ?? [];

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
      >
        <Feather name="chevron-left" size={28} color="white" />
      </Pressable>
      <ListingDetailHeaderActions
        isSaved={isSaved}
        onToggleSave={onToggleSave}
        onShare={onShare}
        onReport={onReport}
      />
    </View>
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant='headline-sm'>{item.title}</AppText>
      <AppText variant='body-sm'>${item.price}</AppText>
      {/* Slider */}
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, index) => `${uri}-${index}`}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH
          );
          setActiveIndex(index);
        }}
        style={styles.slider}
        renderItem={({ item: image }) => (
          <View style={{ width: SCREEN_WIDTH - 32 }}>
            <Image
              source={{ uri: image }}
              style={styles.fullImage}
              resizeMode="cover"
            />
          </View>
        )}
      />
      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              activeIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Details */}
      <View style={styles.content}>
        <DisplayField title="Location">
          {`${item.street}, ${item.city}, ${item.province}`}
        </DisplayField>
        <View style={styles.mapContainer}>
          {/* Static location preview — not pannable/zoomable */}
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            region={defaultRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            pointerEvents="none"
          >
            <Marker
              key={item.id}
              coordinate={{
                latitude: Number(item.latitude),
                longitude: Number(item.longitude),
              }}
            >
            </Marker>
          </MapView>
        </View>

        {/* Owner */}
        <View style={styles.section}>
          <AppText variant='headline-sm'>Meet Your Roomate</AppText>

          <ProfileSection listing={item} />

          <DisplayField title="About Room & House" type="pill">
            {[`${item.bedrooms} Bed`, `${item.bathrooms} Bath`, `${item.roomType}`, `${item.sizeSqft} sqft`, item.furnished ? 'Furnished' : 'Unfurnished', ...(item.roomDetail ?? [])]}
          </DisplayField>

          <DisplayField title="Looking For" type="pill">
            {item.lookingFor}
          </DisplayField>
          <AppText variant="body-sm-strong">Move-in Details</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• {item.availableFrom}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Rent: ${item.price} / {item.leaseType === "Month-to-Month" ? "Month" : "Fixed Term"}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Utility: {item.utilityIncluded ? 'Included' : 'Not Included'}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Deposit: ${item.deposit}</AppText>
        </View>
      </View>
      <AppButton
        text="Edit Listing"
        type="secondary"
        onPress={() => router.push('/(tabs)/post')}
      />
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 16,
    overflow: 'hidden'
  },
  topBar: {
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  slider: {
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 6,
  },
  mapContainer: {
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
  },
  section: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 20,
  },
  fullImage: {
    width: '100%',
    height: 260,
    borderRadius: 0,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  activeDot: {
    backgroundColor: 'white',
    width: 8,
    height: 8,
  },
});
