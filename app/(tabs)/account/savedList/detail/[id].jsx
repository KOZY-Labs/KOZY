import { View, Text, StyleSheet, Platform, FlatList, Image, Dimensions, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useMemo } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useListing } from '@/hooks/use-listings';
import DisplayField from '@/components/ui/displayField';
import AppButton from '@/components/ui/appButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.8;
const ITEM_SPACING = 12;
const IMAGE_HEIGHT = 228;

export default function SavedListDetail() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);
  const userVerified = true; // TODO: replace with real verification logic

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({
        tabBarStyle: { display: 'none' },
      });

      return () => {
        parent?.setOptions({
          tabBarStyle: {
            position: 'absolute',
            alignSelf: 'center', 
            bottom: insets.bottom + 10,
            borderRadius: 16,
            borderTopWidth: 0,
            height: 56,
            backgroundColor: 'rgba(0,0,0,1)',
            maxWidth: 400,
            paddingTop: 7,
            marginHorizontal: 16,
          },
        });
      };
    }, [navigation, insets.bottom])
  );

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

  const sendChatRequest = () => {
    if(userVerified) {
      Alert.alert(
        'Chat Request Sent', 
        `Your request has been sent to the room provider. You’ll be notified once it’s accepted.\n\n🔔 Want to get notified? Turn on chat alerts in your notification settings.`,
        [
          { 
            text: 'Go to Settings',
            onPress: () => {
              router.push('/(tabs)/account/notification');
          }, 
          },
          { 
            text: 'Close', 
            style: 'cancel' 
          },
        ]
      );
    } else {
      Alert.alert(
        '',
        'To send a chat request, please upload a photo and set your preferences. This helps build trust and improves your match quality.',
        [
          {
            text: 'Close',
            style: 'cancel',
        },
        {
          text: 'Complete Profile',
          onPress: () => {
              router.push('/(tabs)/account/editProfile');
          },
        },
      ]
      );
    }
  };
  

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

  return (
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Room Details</Text>
        <FlatList
          data={item.images ?? []}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH + ITEM_SPACING}
          decelerationRate="fast"
          contentContainerStyle={{
              paddingRight: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
          }}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          renderItem={({ item: image }) => (
            <View style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}>
              <Image
                  source={{ uri: image }}
                  style={styles.image}
                  resizeMode="cover"
              />
            </View>
          )}
        />
        
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
                  title={item.title}
                  description={`$${item.price}`}
                  onPress={() => {
                    router.push(`(tabs)/home/${item.id}`);
                  }}
                />
            </MapView>
          </View>
          <DisplayField title="Price">
            ${item.price} / month
          </DisplayField>

          <DisplayField title="Room Type">
            {item.roomType}
          </DisplayField>

          <DisplayField title="Bathroom Type">
            {item.bathroomType}
          </DisplayField>

          <DisplayField title="Available From">
            {item.availableFrom}
          </DisplayField>

          <DisplayField title="Lease Type">
            {item.leaseType}
          </DisplayField>

          <DisplayField title="Furnished">
            {item.furnished ? 'Yes' : 'No'}
          </DisplayField>

          {/* Amenities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            {(item.roomDetail ?? []).map((a, index) => (
              <Text key={index} style={styles.amenity}>
                • {a}
              </Text>
            ))}
          </View>

          {/* Specs */}
          <View style={styles.specRow}>
            <Text style={styles.spec}>🛏 {item.bedrooms} bed</Text>
            <Text style={styles.spec}>🛁 {item.bathrooms} bath</Text>
            <Text style={styles.spec}>📐 {item.sizeSqft} sqft</Text>
          </View>

          {/* <View style={styles.divider}></View> */}

          {/* Owner */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roommate Information</Text>
            <FlatList
              data={item.owner?.avatar ?? []}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={ITEM_WIDTH + ITEM_SPACING}
              decelerationRate="fast"
              contentContainerStyle={{
                  paddingRight: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
              }}
              keyExtractor={(uri, index) => `${uri}-${index}`}
              renderItem={({ item: image }) => (
                <View style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}>
                  <Image
                      source={{ uri: image }}
                      style={styles.image}
                      resizeMode="cover"
                  />
                </View>
              )}
            />
            <DisplayField title="Name">
              {item.owner?.name}
            </DisplayField>

            <DisplayField title="Age Group">
              {item.owner?.ageGroup}
            </DisplayField>

            <DisplayField title="Gender">
              {item.owner?.gender}
            </DisplayField>

            <DisplayField title="Occupation">
              {item.owner?.occupation}
            </DisplayField>

            <DisplayField title="Personality">
              {item.owner?.personality}
            </DisplayField>

            <DisplayField title="Lifestyle">
              {item.owner?.lifestyle}
            </DisplayField>

            <DisplayField title="About Me">
              {item.owner?.aboutMe}
            </DisplayField>
          </View>
        </View> 
        <AppButton 
            text="Send Chat Request" 
            type="primary" 
            onPress={sendChatRequest}
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
  mapContainer: {
    height: 80,
    borderRadius: 4,
    overflow: 'hidden',
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    borderRadius: 4,
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
  topBar: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
});
