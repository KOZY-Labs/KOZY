import { View, TextInput, StyleSheet } from "react-native";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { colors } from '@/constants/colors';
import AppButton from "../appButton";
import AppIconButton from "../appIconButton";

export default function ChatInput({ onSend, onCamera, onLibrary, disabled = false, placeholder }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (disabled || !text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View style={styles.container}>
      {/* Wrapper lifts the icons to sit level with the Send button (AppIconButton
          has no style passthrough). */}
      {onCamera ? (
        <View style={styles.attach}>
          <AppIconButton
            icon={<Feather name="camera" />}
            type="bare"
            accessibilityLabel="Take a photo"
            state={disabled ? "disabled" : "normal"}
            onPress={onCamera}
          />
        </View>
      ) : null}
      {onLibrary ? (
        <View style={styles.attach}>
          <AppIconButton
            icon={<Feather name="image" />}
            type="bare"
            accessibilityLabel="Choose a photo or video"
            state={disabled ? "disabled" : "normal"}
            onPress={onLibrary}
          />
        </View>
      ) : null}
      <TextInput
        allowFontScaling={false}
        value={text}
        onChangeText={setText}
        editable={!disabled}
        // Multiline: return inserts a newline instead of dismissing the keyboard;
        // sending is the Send button's job.
        multiline
        placeholder={placeholder ?? (disabled ? "Chat request pending..." : "Type a message...")}
        placeholderTextColor={colors.semantic.input.textDisabled}
        style={styles.input}
      />
      <AppButton
        onPress={handleSend}
        type="secondary"
        size="sm"
        text="Send"
        state={disabled ? "disabled" : "normal"}
        style={styles.send}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    // flex-end keeps the buttons anchored at the bottom as the multiline input grows.
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderColor: colors.base.primary,
    backgroundColor: colors.base.background,
  },
  input: {
    flex: 1,
    color: colors.semantic.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 110,
  },
  send:{
    width: 80,
  },
  attach: {
    marginBottom: 4,
    marginRight: 10,
  },
});
