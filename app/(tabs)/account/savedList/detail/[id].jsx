import { View, Text, StyleSheet, Platform, FlatList, Image, Dimensions, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useListing } from '@/hooks/use-listings';
import DisplayField from '@/components/ui/displayField';
import AppButton from '@/components/ui/appButton';
import { useAuth } from '@/context/AuthContext';
import { requestChat } from '@/lib/db/chats';
import { useExistingChat } from '@/hooks/use-chats';
import { ownerFromProfile } from '@/lib/listingDraft';
import { showAuthGate } from '@/lib/authGate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.8;
const ITEM_SPACING = 12;
const IMAGE_HEIGHT = 228;

export default function SavedListDetail() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);
  const { uid, profile } = useAuth();
  const existingChat = useExistingChat(listingId, uid);

  // Tab bar visibility is handled centrally in (tabs)/_layout.jsx.

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

  const sendChatRequest = async () => {
    if (!uid) {
      showAuthGate({
        title: 'Start chatting with your match 💬',
        message: 'Sign Up or Log In to connect with potential roommates.',
      });
      return;
    }
    if (uid === item?.ownerId) {
      Alert.alert('This is your listing', 'You can’t send a chat request to yourself.');
      return;
    }
    try {
      const chatId = await requestChat({
        listing: item,
        requesterId: uid,
        requesterInfo: ownerFromProfile(profile),
        firstMessage: `Hi, I'm interested in your listing at ${item.street}, ${item.city}. Is it still available?`,
      });
      Alert.alert(
        'Chat Request Sent',
        `Your request has been sent to the room provider. You’ll be notified once it’s accepted.`,
        [
          { text: 'Open Chat', onPress: () => router.push(`/(tabs)/chat/${chatId}`) },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } catch (e) {
      Alert.alert('Request failed', e?.message ?? 'Please try again.');
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
        {/* No chat CTA on the viewer's own listing */}
        {uid !== item.ownerId && (
          <AppButton
              text={
                existingChat
                  ? (existingChat.requestStatus === 'accepted' ? 'Chat in Progress' : 'Chat Request Sent')
                  : 'Send Chat Request'
              }
              type="primary"
              state={existingChat ? 'disabled' : 'normal'}
              onPress={sendChatRequest}
          />
        )}
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
