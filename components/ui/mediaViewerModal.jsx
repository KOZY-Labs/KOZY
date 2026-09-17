// Fullscreen viewer for media (chat, profile photos, listing galleries). Images and
// videos share the same shell: close button (top-right), pinch to zoom (1–4×) with
// pan while zoomed. Videos auto-play on open and keep the native controls (pause/
// seek); pinch still works because it's a two-finger gesture and the pan only
// engages when zoomed. Pass `items` (array of {type, url}) to browse a gallery —
// arrows on both sides plus horizontal swipe (only while not zoomed).
import { useEffect, useState } from "react";
import { useEventListener } from "expo";
import { Modal, StyleSheet, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";

import AppIconButton from "./appIconButton";
import AppText from "./appText";

const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 60;

function ZoomableView({ children, onSwipe }) {
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
  // At 1× a horizontal drag pages the gallery instead (when there is one).
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      }
    })
    .onEnd((e) => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      if (savedScale.value <= 1 && onSwipe) {
        if (e.translationX < -SWIPE_THRESHOLD) {
          runOnJS(onSwipe)(1);
        } else if (e.translationX > SWIPE_THRESHOLD) {
          runOnJS(onSwipe)(-1);
        }
      }
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
  // When playback finishes the player parks at the end, where play() is a no-op
  // (seen on Android: the video "won't play again"). Rewind so the play control
  // restarts it from the beginning.
  useEventListener(player, "playToEnd", () => {
    player.currentTime = 0;
    player.pause();
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
      fullscreenOptions={{ enable: false }}
    />
  );
}

// `media` opens the viewer (and is the item shown); `items` is an optional gallery
// the viewer can page through — media should be one of its entries.
export default function MediaViewerModal({ media, items, onClose }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const list = items?.length ? items : media ? [media] : [];

  // On open, start at the tapped item. Keyed on `media` only — callers commonly
  // build `items` inline, and re-running on every new array identity would snap
  // the index back mid-browse.
  useEffect(() => {
    if (!media) return;
    const start = items?.findIndex((item) => item.url === media.url) ?? -1;
    setIndex(start >= 0 ? start : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  const current = list[Math.min(index, list.length - 1)] ?? null;
  const goTo = (delta) =>
    setIndex((i) => Math.min(list.length - 1, Math.max(0, i + delta)));

  return (
    <Modal
      visible={!!media}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Modal renders in its own native window — needs its own gesture root. */}
      <GestureHandlerRootView style={styles.backdrop}>
        {current ? (
          <ZoomableView key={current.url} onSwipe={list.length > 1 ? goTo : undefined}>
            {current.type === "video" ? (
              <FullscreenVideo url={current.url} />
            ) : (
              <Image source={{ uri: current.url }} style={styles.media} resizeMode="contain" />
            )}
          </ZoomableView>
        ) : null}
        {/* Type + position: with videos and photos mixed in one gallery, the pill
            is what tells the viewer "this is the video, the rest are photos". */}
        {list.length > 1 && current ? (
          <View style={[styles.counter, { bottom: insets.bottom + 50 }]} pointerEvents="none">
            <Feather name={current.type === "video" ? "video" : "image"} size={13} color="#fff" />
            <AppText variant="body-xsm-strong" textColor="#fff">
              {Math.min(index, list.length - 1) + 1} / {list.length}
            </AppText>
          </View>
        ) : null}
        {list.length > 1 && index > 0 ? (
          <View style={[styles.navButton, styles.navLeft]}>
            <AppIconButton
              icon={<Feather name="chevron-left" />}
              type="bare"
              shadow
              accessibilityLabel="Previous"
              onPress={() => goTo(-1)}
            />
          </View>
        ) : null}
        {list.length > 1 && index < list.length - 1 ? (
          <View style={[styles.navButton, styles.navRight]}>
            <AppIconButton
              icon={<Feather name="chevron-right" />}
              type="bare"
              shadow
              accessibilityLabel="Next"
              onPress={() => goTo(1)}
            />
          </View>
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
  counter: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 2,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    zIndex: 2,
  },
  navLeft: {
    left: 8,
  },
  navRight: {
    right: 8,
  },
});
