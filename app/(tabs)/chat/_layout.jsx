import { Stack } from 'expo-router';

import HeaderBackButton from '@/components/navigation/headerBackButton';

export default function ChatStack() {
  return (
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false, headerBackButtonDisplayMode: 'minimal', headerBackVisible: false, headerLeft: () => <HeaderBackButton fallback="/(tabs)/chat" /> }}>
      <Stack.Screen name="index" options={{ title: 'Messages' }} />
      <Stack.Screen
        name="[chatId]"
        options={{
          title: '',
          headerShown: true,
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/chat" accessibilityLabel="Back to messages" />,
        }}
      />
      {/* Listing detail opened from a chat — the screen supplies its own back button. */}
      <Stack.Screen name="listing/[id]" options={{ title: '' }} />
    </Stack>
  );
}
