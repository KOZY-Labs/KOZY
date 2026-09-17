// The one back button for every stack header. Native back glyphs differ per
// platform (iOS chevron vs Android arrow), so stacks hide the native button and
// render this instead — same chevron on both. `backTo` (a route param some
// flows pass) wins over popping; `fallback` covers deep links with no history.
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function HeaderBackButton({
  onPress,
  backTo,
  fallback = '/(tabs)/home',
  accessibilityLabel = 'Go back',
}) {
  const goBack = () => {
    if (typeof backTo === 'string' && backTo.length > 0) {
      router.replace(backTo);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  };
  return (
    <Pressable
      onPress={onPress ?? goBack}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={styles.button}
    >
      <Ionicons name="chevron-back" size={24} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
