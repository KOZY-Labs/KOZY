import { View, Text, StyleSheet, Platform, FlatList, Image, Dimensions, ScrollView, Alert } from 'react-native';
import { router  } from 'expo-router';
import React, { useMemo, useState } from 'react';
import MapView, { Marker } from 'react-native-maps';

import { useListingDraft } from '@/context/ListingDraftContext';
import { useAuth } from '@/context/AuthContext';
import { draftToPreview, normalizeDraft, ownerFromProfile } from '@/lib/listingDraft';
import { createListing, updateListing, deleteListing } from '@/lib/db/listings';
import { uploadListingImages, uploadListingVideo } from '@/lib/utils/uploadMedia';
import DisplayField from '@/components/ui/displayField';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import ProfileSection from '@/components/ui/profileSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PreviewListing() {
  const { draft, resetDraft } = useListingDraft();
  const { profile, uid } = useAuth();
  const item = useMemo(() => draftToPreview(draft, profile), [draft, profile]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!uid) {
      Alert.alert('Sign in required', 'Please log in again to publish your listing.');
      return;
    }
    setPublishing(true);
    let createdId = null;
    try {
      // 1) create the listing as a draft (gives us an id for the media paths)
      const payload = normalizeDraft(draft);
      createdId = await createListing({ ...payload, ownerId: uid, owner: ownerFromProfile(profile), status: 'draft' });
      // 2) upload media to listings/{id}/...
      const images = draft.photos?.length ? await uploadListingImages(createdId, draft.photos) : [];
      const videoUrl = draft.video ? await uploadListingVideo(createdId, draft.video) : '';
      // 3) attach media + publish
      await updateListing(createdId, { images, videoUrl, status: 'published', publishedDate: new Date().toISOString() });
      resetDraft();
      router.replace({ pathname: '/(tabs)/post/confirmPublish', params: { id: createdId } });
    } catch (e) {
      // Clean up the half-created draft so failed publishes don't leave orphans.
      if (createdId) {
        try { await deleteListing(createdId); } catch { /* best effort */ }
      }
      Alert.alert('Publish failed', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

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

  if (!item) {
    return (
      <View style={styles.center}>
        <Text>Item not found</Text>
      </View>
    );
  }

  return (
    <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant='headline-sm'>{item.title}</AppText>
        <AppText variant='body-sm'>${item.price}</AppText>
      {/* Slider */}
      <FlatList
        data={item.images}
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
        {item.images.map((_, index) => (
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
            <MapView 
              style={StyleSheet.absoluteFill} 
              initialRegion={defaultRegion}
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
            <ProfileSection userId={item.owner.id} listing={item} />
            <DisplayField title="About Room & House" type="pill">
              {[`${item.bedrooms} Bed`, `${item.bathrooms} Bath`, `${item.roomType}`, `${item.sizeSqft} sqft`, item.furnished ? 'Furnished' : 'Unfurnished', ...item.roomDetail]}
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
          style={{ marginBottom: 10 }}
          onPress={() => {router.push({
            pathname: '/(tabs)/post/stepOne',
            params: { id: item.id }
          })}}
        />
        <AppButton
          text="Confirm & Publish"
          type="primary"
          loading={publishing}
          loadingLabel="Publishing"
          onPress={handlePublish}
        />
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: 'black', 
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
    overflow: 'hidden'
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  slider:{
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 6,
  },
  price: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  location: {
    color: '#bbb',
    marginBottom: 12,
  },
  mapContainer: {
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
  },
  description: {
    color: 'white',
    lineHeight: 20,
    marginBottom: 16,
  },
  specRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  spec: {
    color: 'white',
  },
  section: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
  },
  amenity: {
    color: '#ccc',
    marginBottom: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  ownerName: {
     display: 'flex', 
     flexDirection: 'column', 
     justifyContent: 'center', 
     alignItems: 'center', 
     gap: 4
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '50%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 9999,
    marginHorizontal: 'auto'
  },
  mapImage: {
    width: '100%',
    height: 78,
    borderRadius: 4,
  },
  content: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#ffffff',
    marginVertical: 8,
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
