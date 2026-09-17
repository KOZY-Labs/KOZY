// Shared shell for the listing detail routes (home, saved list, my listings): data
// fetch, loading/not-found states, top bar (back + save/share/report actions),
// scroll body, and the chat-request CTA. Routes supply only what genuinely differs —
// navigation targets and success feedback — so the CTA/state logic exists once.
import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import { colors } from '@/constants/colors';
import { TOP_INSET_EXTRA } from '@/constants/layout';
import ListingDetailBody from '@/components/ui/listingDetailBody';
import ListingDetailHeaderActions from '@/components/ui/listingDetailHeaderActions';
import { useAuth } from '@/context/AuthContext';
import { useListing } from '@/hooks/use-listings';
import { useListingActions } from '@/hooks/use-listing-actions';
import { useChatRequest } from '@/hooks/use-chat-request';
import { useExistingChat } from '@/hooks/use-chats';
import StickyFooter, { useStickyFooterPadding } from '@/components/ui/layout/stickyFooter';

export default function ListingDetailScreen({
  listingId,
  onBack, // defaults to popping the stack
  backFallback = '/(tabs)/home', // where back lands when there is no history to pop
  showChatCta = false,
  chatBackTo, // where the auth/profile gates return the user
  onChatSuccess, // (chatId) => void
  reloadOnFocus = false, // refetch when returning to this screen (e.g. after an edit)
  footer = null, // (item) => node — extra content under the body (e.g. Edit Listing)
}) {
  const insets = useSafeAreaInsets();
  const footerPadding = useStickyFooterPadding();
  const { uid } = useAuth();
  const { data: item, loading, reload } = useListing(listingId);
  const existingChat = useExistingChat(showChatCta ? listingId : null, uid);
  const { isSaved, onToggleSave, onShare, onReport } = useListingActions(item);
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

  // No chat CTA on the viewer's own listing.
  const showChat = showChatCta && uid !== item.ownerId;
  const hasStickyCta = showChat || !!footer;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 + TOP_INSET_EXTRA }]}>
        <Pressable
          // The profile/report gates return here via replace(), which can leave this
          // screen as the stack root — an unguarded back() would throw GO_BACK unhandled.
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(backFallback)))}
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
        contentContainerStyle={[
          styles.container,
          { paddingBottom: hasStickyCta ? footerPadding : insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ListingDetailBody listing={item} />
      </ScrollView>
      {/* Primary action pinned to the bottom edge — no scrolling to the end of a
          long listing to reach it. The tab bar is hidden on every detail route. */}
      {hasStickyCta ? (
        <StickyFooter>
          {showChat ? (
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
          ) : null}
          {footer?.(item)}
        </StickyFooter>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    paddingHorizontal: 16,
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
