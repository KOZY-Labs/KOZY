// components/form/ErrorMessage.jsx
import { Text, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";

export default function ErrorMessage({ message }) {
  if (!message) return null;

  return <Text allowFontScaling={false} style={styles.error}>⚠️ {message}</Text>;
}

const styles = StyleSheet.create({
  error: {
    marginTop: 6,
    fontSize: 12,
    color: colors.semantic.text.error,
  },
});
