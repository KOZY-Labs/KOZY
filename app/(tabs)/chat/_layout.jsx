import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

// Pop the stack so back slides left-to-right; when the thread was opened from another
// tab (e.g. Send Chat Request on a listing) there is no chat history, so fall back to
// the messages list.
const goBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/chat');
  }
};

export default function ChatStack() {
  return (
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false }}>
      <Stack.Screen name="index" options={{ title: 'Messages' }} />
      <Stack.Screen
        name="[chatId]"
        options={{
          title: '',
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Back to messages"
              hitSlop={10}
            >
              <Feather
                name="chevron-left"
                size={28}
                color="white"
                style={{ marginLeft: 2 }}
              />
            </Pressable>
          ),
        }}
      />
      {/* Listing detail opened from a chat — the screen supplies its own back button. */}
      <Stack.Screen name="listing/[id]" options={{ title: '' }} />
      {/* Report User (re-exported contactUs) — needs the stack header for back. */}
      <Stack.Screen
        name="report"
        options={{
          title: 'Report',
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={10}
            >
              <Feather
                name="chevron-left"
                size={28}
                color="white"
                style={{ marginLeft: 2 }}
              />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
