// components/form/FormField.jsx
import { View, Text, StyleSheet } from "react-native";
import ErrorMessage from "./errorMessage";
import { colors } from "@/constants/colors";
import { getTypeStyle } from '@/constants/typographyStyles';

export default function FormField({
  label,
  error,
  children,
  lastField = false,
  style,
}) {
  return (
    <View style={[styles.container, lastField && { marginBottom: 0 }, style]}>
      {label && <Text allowFontScaling={false} style={[styles.label, getTypeStyle('body-md-strong')]}>{label}</Text>}

      {children}

      <ErrorMessage message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: colors.semantic.text.primary,
  },
});
