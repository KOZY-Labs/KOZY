import { View, StyleSheet, Image, Pressable } from "react-native";
import AppText from "../appText";
import { colors } from "@/constants/colors";
import { avatarSource } from '@/lib/avatar';

const MINE_BUBBLE_COLOR = colors.semantic.bg.info;
const THEIRS_BUBBLE_COLOR = "#1F2937";

export default function MessageBubble({ message, isMine, avatar, onAvatarPress }) {
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

  return (
    <View style={styles.container}>
        {!isMine && (
          <Pressable onPress={onAvatarPress}>
            <Image source={avatarSource(avatar)} style={styles.avatar} />
          </Pressable>
        )}
        <View style={[styles.messageContainer, isMine ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
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
            <AppText variant="caption" color="primary" style={{textAlign: isMine ? "right" : "left"}}>
                {formatTime(message.createdAt)}
            </AppText>
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
