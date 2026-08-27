// Shared shell for the listing detail routes (home, saved list, my listings): data
// fetch, loading/not-found states, top bar (back + save/share/report actions),
// scroll body, and the chat-request CTA. Routes supply only what genuinely differs —
// navigation targets and success feedback — so the CTA/state logic exists once.
import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import { colors } from '@/constants/colors';
import ListingDetailBody from '@/components/ui/listingDetailBody';
import ListingDetailHeaderActions from '@/components/ui/listingDetailHeaderActions';
import { useAuth } from '@/context/AuthContext';
import { useListing } from '@/hooks/use-listings';
import { useListingActions } from '@/hooks/use-listing-actions';
import { useChatRequest } from '@/hooks/use-chat-request';
import { useExistingChat } from '@/hooks/use-chats';

export default function ListingDetailScreen({
  listingId,
  reportBackTo,
  onBack, // defaults to popping the stack
  showChatCta = false,
  chatBackTo, // where the auth/profile gates return the user
  onChatSuccess, // (chatId) => void
  reloadOnFocus = false, // refetch when returning to this screen (e.g. after an edit)
  footer = null, // (item) => node — extra content under the body (e.g. Edit Listing)
}) {
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const { data: item, loading, reload } = useListing(listingId);
  const existingChat = useExistingChat(showChatCta ? listingId : null, uid);
  const { isSaved, onToggleSave, onShare, onReport } = useListingActions(item, { reportBackTo });
  const { sendChatRequest, requesting } = useChatRequest(item, {
    backTo: chatBackTo,
    onSuccess: onChatSuccess,
  });

  // Optional refetch on later focuses (the initial fetch already runs on mount).
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (reloadOnFocus) reload();
    }, [reloadOnFocus, reload])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.base.white} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <AppText variant="body-md" color="primary">Item not found</AppText>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onBack ?? (() => router.back())}
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
        <ListingDetailBody listing={item} />
        {/* No chat CTA on the viewer's own listing */}
        {showChatCta && uid !== item.ownerId && (
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
        {footer?.(item)}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
