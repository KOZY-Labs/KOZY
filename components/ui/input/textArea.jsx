// components/input/TextArea.jsx
import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { getTypeStyle } from '@/constants/typographyStyles';
import AppText from "../appText";
import AdaptiveTextInput from './adaptiveTextInput';

export default function TextArea({
  value,
  placeholder,
  error,
  disabled,
  onChangeText,
  maxLength,
  onFocus,
  onBlur,
  ...prop
}) {

    const [focused, setFocused] = useState(false);
    const borderStyle = () => {
        if (disabled) return colors.semantic.input.border.disabled;
        if (error) return colors.semantic.input.border.error;
        if (focused) return colors.semantic.input.border.focused;
        return colors.semantic.input.border.normal;
    };

    const border = borderStyle();

  return (
    <View>
      <AdaptiveTextInput
        value={value}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.semantic.input.textDisabled}
        multiline
        numberOfLines={4}
        onChangeText={onChangeText}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        maxLength={maxLength}
        style={[
          styles.textarea,
          getTypeStyle('body-xsm'),
          {
            borderColor: border.color,
            borderWidth: border.width,
          },
        ]}
        {...prop}
      />
      {/* One-tap clear, top-right — same affordance as TextField. */}
      {value && !disabled ? (
        <Pressable
          onPress={() => onChangeText?.('')}
          accessibilityRole="button"
          accessibilityLabel="Clear text"
          hitSlop={8}
          style={styles.clearButton}
        >
          <Feather name="x-circle" size={18} color={colors.semantic.input.textDisabled} />
        </Pressable>
      ) : null}
      {/* Counter reflects the ACTUAL limit — only shown when one is set. */}
      {maxLength != null && (
        <AppText
          variant="caption"
          color={(value?.length ?? 0) >= maxLength ? 'error' : 'primary'}
          style={styles.counter}
        >
          {value?.length ?? 0}/{maxLength}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    position: 'absolute',
    top: 10,
    right: 12,
  },
  textarea: {
    width: '100%',
    height: 120,
    paddingHorizontal: 16,
    paddingRight: 40,
    paddingVertical: 8,
    borderRadius: 16,
    color: colors.semantic.input.text,
    textAlignVertical: "top",
  },
  error: {
    borderColor: colors.semantic.input.border.error,
  },
  counter: {
    position: 'absolute',
    bottom: 8,
    right: 16,
  },
});