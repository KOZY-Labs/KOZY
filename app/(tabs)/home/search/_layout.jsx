import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

// Pop the stack so back always slides left-to-right; replace is only a
// no-history fallback (e.g. deep links) since it animates like a push.
const goBack = (fallback) => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
};

export default function SearchStack() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Search',
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => goBack('/home')}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
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
      <Stack.Screen
        name="map"
        options={{
          title: 'Map',
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => goBack('/home/search')}
              accessibilityRole="button"
              accessibilityLabel="Back to search"
              hitSlop={10}
            >
              <Feather name="chevron-left" size={28} color="white" />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: '',
          headerShown: false,
          headerBackVisible: true,
        }}
      />
    </Stack>
  );
}
