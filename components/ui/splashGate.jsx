import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import AppSplash from "@/components/ui/appSplash";
import { useAuth } from "@/context/AuthContext";

// Just long enough to avoid a flash on warm starts — every ms here blocks input on
// EVERY launch, so the brand moment must stay cheap.
const MIN_VISIBLE_MS = 400;
const FADE_OUT_MS = 300;

// Overlays the app with the brand splash until auth has resolved (and the
// minimum display time has elapsed), then fades it out. Must be rendered
// inside AuthProvider.
export default function SplashGate({ children }) {
  const { initializing } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = !initializing && minTimeElapsed;

  useEffect(() => {
    if (!ready || hidden) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHidden(true);
    });
  }, [ready, hidden, opacity]);

  return (
    <View style={styles.root}>
      {children}
      {!hidden ? (
        <Animated.View
          pointerEvents={ready ? "none" : "auto"}
          accessibilityElementsHidden={ready}
          importantForAccessibility={ready ? "no-hide-descendants" : "auto"}
          style={[StyleSheet.absoluteFill, { opacity }]}
        >
          <AppSplash />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
