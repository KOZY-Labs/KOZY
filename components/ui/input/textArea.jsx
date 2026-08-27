// components/input/TextArea.jsx
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import AppText from "../appText";
import AdaptiveTextInput from './adaptiveTextInput';

export default function TextArea({
  value,
  placeholder,
  error,
  disabled,
  onChangeText,
  maxLength,
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        style={[
          styles.textarea,
          typography.body['body-xsm'],
          {
            borderColor: border.color,
            borderWidth: border.width,
          },
        ]}
        {...prop}
      />
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
  textarea: {
    width: '100%',
    height: 120,
    paddingHorizontal: 16,
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