// Fullscreen viewer for chat media. Images and videos share the same shell:
// back button (top-left), pinch to zoom (1–4×) with pan while zoomed. Videos
// auto-play on open and keep the native controls (pause/seek); pinch still works
// because it's a two-finger gesture and the pan only engages when zoomed.
import { Modal, StyleSheet, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";

import AppIconButton from "../appIconButton";

const MAX_SCALE = 4;

function ZoomableView({ children }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Snap fully back when the user zooms out to (near) 1×.
      if (scale.value <= 1.02) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  // Pan only while zoomed — at 1× taps must reach the video's native controls.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
      <Animated.View style={[styles.zoomable, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

// Separate component so the player hook re-mounts per url (clean autoplay).
function FullscreenVideo({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.media}
      nativeControls
      contentFit="contain"
      // Already fullscreen — the native fullscreen button (top-left on iOS, where it
      // collides with our back button) is redundant. AirPlay's position is fixed by
      // AVKit and can't be moved.
      allowsFullscreen={false}
    />
  );
}

export default function MediaViewerModal({ media, onClose }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={!!media}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Modal renders in its own native window — needs its own gesture root. */}
      <GestureHandlerRootView style={styles.backdrop}>
        {media ? (
          <ZoomableView key={media.url}>
            {media.type === "video" ? (
              <FullscreenVideo url={media.url} />
            ) : (
              <Image source={{ uri: media.url }} style={styles.media} resizeMode="contain" />
            )}
          </ZoomableView>
        ) : null}
        {/* Top-RIGHT on purpose: iOS AVKit pins its own (immovable) controls to the
            top-left, so the close button lives on the opposite corner for both
            photos and videos. */}
        <View style={[styles.closeButton, { top: insets.top + 8 }]}>
          <AppIconButton
            icon={<Feather name="x" />}
            type="bare"
            shadow
            accessibilityLabel="Close viewer"
            onPress={onClose}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
  },
  zoomable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    right: 12,
    zIndex: 2,
  },
});
