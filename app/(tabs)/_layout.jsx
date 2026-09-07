import { router, Tabs, usePathname, useSegments } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useChatBadge } from '@/context/ChatBadgeContext';

const HIDDEN_TAB_BAR_STYLE = {
  display: 'none',
  height: 0,
  opacity: 0,
  pointerEvents: 'none',
};


export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { unreadTotal } = useChatBadge();
  const pathname = usePathname();
  const segments = useSegments();
  // Single source of truth for hiding the floating tab bar on immersive sub-screens.
  // Screens must NOT set tabBarStyle imperatively (navigation.getParent().setOptions) —
  // per-screen restores drift from this style and make the bar jump between tabs.
  const onPostSubScreen =
    segments.includes('post') && segments[segments.length - 1] !== 'post';
  const onHomeSearch = segments.includes('home') && segments.includes('search');
  const onChatSubScreen =
    segments.includes('chat') && segments[segments.length - 1] !== 'chat';
  const onAccountImmersive =
    pathname.startsWith('/account/editProfile') ||
    /^\/account\/(myListings|savedList)\/[^/]+/.test(pathname); // deeper than the list index
  const shouldHideTabBar =
    onPostSubScreen ||
    onHomeSearch ||
    onChatSubScreen ||
    onAccountImmersive ||
    pathname.startsWith('/post/') ||
    pathname.startsWith('/home/search');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarStyle: shouldHideTabBar
          ? HIDDEN_TAB_BAR_STYLE
          : {
              position: 'absolute',
              // Explicit insets — alignSelf/width%/maxWidth left the bar
              // left-anchored and narrow on Android.
              left: 16,
              right: 16,
              bottom: insets.bottom + 10,
              overflow: 'hidden',
              borderRadius: 16,
              borderTopWidth: 0,
              height: 56,
              paddingTop: 7,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 10,
            },
        tabBarBackground: shouldHideTabBar
          ? () => null
          : Platform.OS === 'ios'
            ? () => (
                <BlurView
                  intensity={60}
                  tint="dark"
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  {/* 👇 This gives the dark glass look */}
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: 'rgba(0,0,0,0.4)', // tweak 0.3–0.5
                    }}
                  />
                </BlurView>
              )
            : // Android: expo-blur is unreliable there and can leave the bar fully
              // transparent — use a solid near-black background instead.
              () => (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: 16,
                    backgroundColor: 'rgba(20,20,20,0.92)',
                  }}
                />
              ),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        listeners={{
          // Always land on the messages list, even if a thread was open in this tab.
          // Already on the list → no-op (a replace would replay the slide animation).
          tabPress: (event) => {
            event.preventDefault();
            if (pathname === '/chat') return;
            router.replace('/(tabs)/chat');
          },
        }}
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.fill" color={color} />,
          // undefined removes the badge entirely when there's nothing unread.
          tabBarBadge: unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : unreadTotal) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#F0426B',
            color: '#fff',
            fontSize: 11,
            lineHeight: 16,
            // The floating 56px bar + centered icons put the default badge too low/near;
            // nudge it onto the icon's top-right corner.
            marginTop: 2,
            marginLeft: 14,
          },
        }}
      />
      <Tabs.Screen
        name="post"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            if (pathname === '/post') return;
            router.replace('/(tabs)/post');
          },
        }}
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.square" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        listeners={{
          // Always land on My Page root — a stale sub-screen (e.g. Delete Account
          // after the account is gone) must not survive in this tab's stack.
          // Already on the root → no-op (no replayed slide animation).
          tabPress: (event) => {
            event.preventDefault();
            if (pathname === '/account') return;
            router.replace('/(tabs)/account');
          },
        }}
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
