import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { useVideoPlayer, VideoView } from "expo-video";
import { router } from "expo-router";
import AppText from "../appText";


const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = -SCREEN_WIDTH * 0.25;

// Video Item Component
function VideoItem({ videoUrl }) {
  const player = useVideoPlayer(videoUrl, (player) => {
    if (!player) return;
    player.loop = true;
    player.muted = true;
  });

  return (
    <VideoView
      player={player}
      style={styles.thumbnail}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

export default function SwipeToDeleteRow({ item, onDelete }) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .failOffsetY([-25, 25])
    .onUpdate((e) => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        translateX.value = Math.min(0, e.translationX);
      }
    })
    .onEnd(() => {
      if (translateX.value < SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH, {}, () => {
          runOnJS(onDelete)(item.id);
        });
      } else {
        translateX.value = withTiming(0);
      }
    })
    .cancelsTouchesInView(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Delete background */}
      <View style={styles.deleteBackground}>
        <Text allowFontScaling={false} style={styles.deleteText}>Delete</Text>
      </View>

      {/* Swipeable content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.row, animatedStyle]}>
            <View style={styles.card} >
                <Pressable onPress={() => router.push(`account/myListings/${item.id}`)}>
                    <VideoItem videoUrl={item.videoUrl} />
                </Pressable>
                <View style={styles.infoWrapper}>
                    <AppText 
                        variant="body-sm-strong" 
                        color="primary"
                    >
                        ${item.price} / month
                    </AppText>
                    <AppText
                        variant="body-xsm"
                        color="primary"
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={{ flexShrink: 1 }}
                    >
                        {item.street}, {item.city}, {item.province}
                    </AppText>
                
                    <AppText 
                        variant="body-xsm" 
                        color="primary"
                        style={{ marginTop: 4 }}
                    >
                        Published on: {item.publishedDate}
                    </AppText>
                </View>
            </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      width: "100%",
      backgroundColor: "#ff3b30",
      overflow: "hidden",
    },
    deleteBackground: {
      position: "absolute",
      right: 20,
      height: "100%",
      justifyContent: "center",
      borderRadius: 8,
    },
    deleteText: {
      color: "white",
      fontWeight: "600",
    },
    card: {
        display: 'flex',
        flexDirection: 'row',
        gap: 20,
        marginVertical: 12,
        alignItems: 'center',
    },
    row: {
      backgroundColor: "#000000",
    },
    infoWrapper: {
        flex: 1,
      },
    thumbnail: {
        width: 100,
        aspectRatio: 9/16,
        borderRadius: 4,
    }
  });
  