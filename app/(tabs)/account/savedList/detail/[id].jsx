import { View, Text, StyleSheet, Platform, FlatList, Image, Dimensions, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';

import { useListing } from '@/hooks/use-listings';
import DisplayField from '@/components/ui/displayField';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import ProfileSection from '@/components/ui/profileSection';
import ListingDetailHeaderActions from '@/components/ui/listingDetailHeaderActions';
import ListingLocationMap from '@/components/ui/listingLocationMap';
import { useAuth } from '@/context/AuthContext';
import { requestChat } from '@/lib/db/chats';
import { useExistingChat } from '@/hooks/use-chats';
import { useListingActions } from '@/hooks/use-listing-actions';
import { ownerFromProfile } from '@/lib/listingDraft';
import { showAuthGate } from '@/lib/authGate';
import { getMissingProfileFields, showProfileGate } from '@/lib/profileCompleteness';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SavedListDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);
  const { uid, profile } = useAuth();
  const existingChat = useExistingChat(listingId, uid);
  const [activeIndex, setActiveIndex] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const { isSaved, onToggleSave, onShare, onReport } = useListingActions(item, {
    reportBackTo: '/(tabs)/account/savedList',
  });

  // Tab bar visibility is handled centrally in (tabs)/_layout.jsx.

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
    // Chatting requires a complete profile (everything except About Me).
    const missing = getMissingProfileFields(profile);
    if (missing.length) {
      showProfileGate({ missing, backTo: `/(tabs)/account/savedList/detail/${listingId}` });
      return;
    }
    setRequesting(true);
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
    } finally {
      setRequesting(false);
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
        {/* Tap opens a full-screen map with just this listing's pin */}
        <ListingLocationMap latitude={item.latitude} longitude={item.longitude} />

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

          {item.description ? (
            <DisplayField title="Description">
              {item.description}
            </DisplayField>
          ) : null}
          <AppText variant="body-sm-strong">Move-in Details</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• {item.availableFrom}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Rent: ${item.price} / {item.leaseType === "Month-to-Month" ? "Month" : "Fixed Term"}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Utility: {item.utilityIncluded ? 'Included' : 'Not Included'}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Deposit: ${item.deposit}</AppText>
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
          loading={requesting}
          loadingLabel="Sending request"
          onPress={sendChatRequest}
        />
      )}
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
