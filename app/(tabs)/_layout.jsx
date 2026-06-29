import { router, Tabs, usePathname, useSegments } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const HIDDEN_TAB_BAR_STYLE = {
  display: 'none',
  height: 0,
  opacity: 0,
  pointerEvents: 'none',
};


export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  // Hide the floating tab bar on any post sub-step (stepOne..confirmPublish/uploadedPost)
  // and on the home search flow. The post index ('/post') keeps the tab bar.
  const onPostSubScreen =
    segments.includes('post') && segments[segments.length - 1] !== 'post';
  const onHomeSearch = segments.includes('home') && segments.includes('search');
  const shouldHideTabBar =
    onPostSubScreen ||
    onHomeSearch ||
    pathname.startsWith('/post/') ||
    pathname.startsWith('/home/search');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarContainerStyle: {
          alignItems: 'center',
        },
        tabBarStyle: shouldHideTabBar
          ? HIDDEN_TAB_BAR_STYLE
          : {
              position: 'absolute',
              alignSelf: 'center',
              bottom: insets.bottom + 10,
              overflow: 'hidden',
              borderRadius: 16,
              borderTopWidth: 0,
              height: 56,
              maxWidth: 400,
              width: '100%',
              paddingTop: 7,
              marginHorizontal: 16,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 10,
            },
        tabBarBackground: shouldHideTabBar
          ? () => null
          : () => (
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
        options={{
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
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
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
