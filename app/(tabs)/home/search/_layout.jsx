import { Stack } from 'expo-router';

import HeaderBackButton from '@/components/navigation/headerBackButton';

export default function SearchStack() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false, headerBackButtonDisplayMode: 'minimal', headerBackVisible: false, headerLeft: () => <HeaderBackButton fallback="/home" /> }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Search',
          headerShown: true,
          headerLeft: () => <HeaderBackButton fallback="/home" accessibilityLabel="Back to home" />,
        }}
      />
      <Stack.Screen
        name="map"
        options={{
          title: 'Map',
          headerShown: true,
          headerLeft: () => <HeaderBackButton fallback="/home/search" accessibilityLabel="Back to search" />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: '',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
