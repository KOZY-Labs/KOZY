import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, Image, Dimensions, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useListing } from '@/hooks/use-listings';
import DisplayField from '@/components/ui/displayField';
import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import ProfileSection from '@/components/ui/profileSection';
import ListingDetailHeaderActions from '@/components/ui/listingDetailHeaderActions';
import ListingLocationMap from '@/components/ui/listingLocationMap';
import { useAuth } from '@/context/AuthContext';
import { getMissingProfileFields, showProfileGate } from '@/lib/profileCompleteness';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import { requestChat } from '@/lib/db/chats';
import { useExistingChat } from '@/hooks/use-chats';
import { useListingActions } from '@/hooks/use-listing-actions';
import { ownerFromProfile } from '@/lib/listingDraft';
import { showAuthGate } from '@/lib/authGate';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, backTo } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const { data: item, loading } = useListing(listingId);
  const { uid, profile } = useAuth();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [requesting, setRequesting] = React.useState(false);
  const existingChat = useExistingChat(listingId, uid);
  const { isSaved, onToggleSave, onShare, onReport } = useListingActions(item, {
    reportBackTo: '/(tabs)/home',
  });

  const handleChatRequest = async () => {
    if (!uid) {
      showAuthGate({
        title: 'Start chatting with your match 💬',
        message: 'Sign Up or Log In to connect with potential roommates.',
        redirect: `/home/${listingId}`,
      });
      return;
    }
    if (uid === item?.ownerId) {
      showAlertModal({ title: 'This is your listing', message: 'You can’t send a chat request to yourself.' });
      return;
    }
    // Chatting requires a complete profile (everything except About Me).
    const missing = getMissingProfileFields(profile);
    if (missing.length) {
      showProfileGate({ missing, backTo: `/home/${listingId}` });
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
      router.push(`/(tabs)/chat/${chatId}`);
    } catch (e) {
      showAlertModal({ title: 'Request failed', message: e?.message ?? 'Please try again.' });
    } finally {
      setRequesting(false);
    }
  };

  const handleBack = useCallback(() => {
    // Prefer popping the stack — returns to whichever screen pushed this one (reel, map
    // card, home feed) without stacking a duplicate instance. `backTo` replace is only a
    // fallback for when there is no navigation history (e.g. deep links).
    if (router.canGoBack()) {
      router.back();
      return;
    }

    const target = Array.isArray(backTo) ? backTo[0] : backTo;
    if (target) {
      router.replace(parseBackRoute(target));
      return;
    }

    router.back();
  }, [backTo]);

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
          onPress={handleBack}
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

            <ProfileSection userId={item.owner?.id} listing={item}/>

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
            onPress={handleChatRequest}
          />
        )}
      </ScrollView>
    </>
  );
}

function parseBackRoute(target) {
  try {
    const parsed = JSON.parse(target);
    if (parsed?.pathname) return parsed;
  } catch {
    // Keep supporting simple string routes.
  }

  return target;
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
