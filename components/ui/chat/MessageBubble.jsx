import { View, StyleSheet, Image, Pressable, useWindowDimensions } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather } from "@expo/vector-icons";
import AppText from "../appText";
import { colors } from "@/constants/colors";
import { avatarSource } from '@/lib/avatar';

const MINE_BUBBLE_COLOR = colors.semantic.bg.info;
const THEIRS_BUBBLE_COLOR = "#1F2937";

// Inline video preview: first frame + play overlay; tapping opens the fullscreen
// viewer (autoplay + native controls + pinch zoom). Split out as a component
// because useVideoPlayer is a hook (can't be conditional in the bubble).
function VideoMessage({ url, width, onPress }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = true;
  });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Play video">
      <VideoView
        player={player}
        style={{ width, height: (width * 9) / 16, borderRadius: 16, backgroundColor: '#000' }}
        nativeControls={false}
        contentFit="cover"
        pointerEvents="none"
      />
      <View style={styles.playOverlay} pointerEvents="none">
        <View style={styles.playCircle}>
          <Feather name="play" size={22} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </Pressable>
  );
}

export default function MessageBubble({ message, isMine, avatar, onAvatarPress, showStatus, onMediaPress }) {
  const { width: screenWidth } = useWindowDimensions();
  const mediaWidth = Math.round(screenWidth * 0.6);
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getHours();
    const mins = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    const minsStr = mins < 10 ? `0${mins}` : mins;
    return `${hours}:${minsStr}${ampm}`;
  };



  if (message.type === "system") {
    return (
      <View style={styles.systemContainer}>
        <AppText variant="caption" color="secondary" style={styles.systemText}>
          {message.text}
        </AppText>
      </View>
    );
  }

  const isImage = message.type === 'image' && message.mediaUrl;
  const isVideo = message.type === 'video' && message.mediaUrl;

  return (
    <View style={styles.container}>
        {!isMine && (
          <Pressable onPress={onAvatarPress}>
            <Image source={avatarSource(avatar)} style={styles.avatar} />
          </Pressable>
        )}
        <View style={[styles.messageContainer, isMine ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
            {isImage ? (
                <Pressable onPress={() => onMediaPress?.(message)} accessibilityRole="imagebutton">
                    <Image
                        source={{ uri: message.mediaUrl }}
                        style={[styles.mediaImage, { width: mediaWidth, height: mediaWidth }]}
                    />
                </Pressable>
            ) : isVideo ? (
                <VideoMessage
                    url={message.mediaUrl}
                    width={mediaWidth}
                    onPress={() => onMediaPress?.(message)}
                />
            ) : (
                <View
                    style={[
                        styles.bubble,
                        isMine ? styles.mine : styles.theirs,
                    ]}
                >
                    <View
                        style={[
                            styles.tail,
                            isMine ? styles.mineTail : styles.theirsTail,
                        ]}
                    />
                    <AppText variant="body-xs">{message.text}</AppText>
                </View>
            )}
            <AppText variant="caption" color="primary" style={{textAlign: isMine ? "right" : "left"}}>
                {formatTime(message.createdAt)}
            </AppText>
            {isMine && showStatus ? (
                <AppText variant="caption" style={styles.statusText}>
                    {message.status === 'read' ? 'Read' : 'Delivered'}
                </AppText>
            ) : null}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
    gap: 8,
  },
messageContainer: {
    flex:1,
},
  bubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
    position: "relative",
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: MINE_BUBBLE_COLOR,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: THEIRS_BUBBLE_COLOR,
  },
  tail: {
    position: "absolute",
    bottom: 0,
    width: 14,
    height: 14,
  },
  mineTail: {
    right: -2,
    backgroundColor: MINE_BUBBLE_COLOR,
    borderBottomLeftRadius: 16,
    transform: [{ rotate: "-28deg" }],
  },
  theirsTail: {
    left: -2,
    backgroundColor: THEIRS_BUBBLE_COLOR,
    borderBottomRightRadius: 16,
    transform: [{ rotate: "28deg" }],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  mediaImage: {
    borderRadius: 16,
    backgroundColor: '#191A22',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#9BA1AC',
    textAlign: 'right',
    marginTop: 2,
  },
  systemContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  systemText: {
    backgroundColor: colors.semantic.bg.greyAlpha,
    color: colors.semantic.text.primary,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
