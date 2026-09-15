// "Check your email" card shared by signup verification and forgot-password: the
// AuthCard shell + mail icon, with the screen's status/resend rows as children so
// the recovery actions live inside the card, next to the message they belong to.
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import AuthCard from "@/components/ui/authInputCard";
import AppText from "@/components/ui/appText";
import { colors } from "@/constants/colors";

export default function EmailSentCard({ title, description, children }) {
  return (
    <AuthCard title={title} description={description}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Feather name="mail" size={28} color={colors.base.accent} />
        </View>
        {children}
      </View>
    </AuthCard>
  );
}

// Text link for use INSIDE the white card (AppButton's bare type is white-on-white
// there). Accent while active; the disabled countdown stays clearly legible.
export function CardLink({ text, onPress, disabled = false, loading = false }) {
  const inactive = disabled || loading;
  const color = inactive ? colors.base.gray700 : colors.base.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && !inactive && { opacity: 0.7 }]}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : null}
      <AppText variant="body-sm-strong" textColor={color} style={{ textDecorationLine: "underline" }}>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    gap: 16,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(38, 86, 251, 0.12)",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
});
