import { View, TextInput, StyleSheet } from "react-native";
import { useState } from "react";
import { colors } from '@/constants/colors';
import AppButton from "../appButton";

export default function ChatInput({ onSend, disabled = false, placeholder }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (disabled || !text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        editable={!disabled}
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
    alignItems: "center",
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
  },
  send:{
    width: 80,
  }
});
