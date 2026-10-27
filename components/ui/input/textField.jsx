// components/input/TextField.jsx
import { useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import { Feather } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { getTypeStyle } from '@/constants/typographyStyles';
import AdaptiveTextInput from './adaptiveTextInput';

export default function TextField({
  value,
  placeholder,
  error,
  disabled,
  onChangeText,
  onFocus,
  onBlur,
  type,
  style,
  containerStyle,
  suffixText,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  // Every text box gets a trailing ✕ that clears it in one tap (while it has a
  // value and no custom right icon, e.g. the password eye, is in the way).
  clearable = true,
  ...props
}) {

  const [focused, setFocused] = useState(false);
  const showClear = clearable && !rightIcon && !disabled && !!value;
  const trailingIcon = showClear
    ? <Feather name="x-circle" size={18} color={colors.semantic.input.textDisabled} />
    : rightIcon;
  const trailingPress = showClear ? () => onChangeText?.('') : onRightIconPress;
  const trailingLabel = showClear ? 'Clear text' : rightIconAccessibilityLabel;

  const borderStyle = () => {
    if (disabled) return colors.semantic.input.border.disabled;
    if (error) return colors.semantic.input.border.error;
    if (focused) return colors.semantic.input.border.focused;
    return colors.semantic.input.border.normal;
  };

  // If type is 'auth', override border and text color to gray800
  const isAuth = type === 'auth';
  const border = isAuth
    ? { color: colors.base.gray800, width: 1 }
    : borderStyle();

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <AdaptiveTextInput
        {...props}
        secureTextEntry={props.secureTextEntry}
        value={value}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.semantic.input.textDisabled}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          type === 'auth' && styles.authInput,
          getTypeStyle('body-xsm'),
          {
            borderColor: border.color,
            borderWidth: border.width,
            color: isAuth ? colors.base.gray800 : colors.semantic.input.text,
          },
          trailingIcon && styles.inputWithIcon,
          suffixText && styles.inputWithSuffix,
          suffixText && trailingIcon && styles.inputWithSuffixAndIcon,
          style,
        ]}
      />
      {suffixText ? (
        <Text
          allowFontScaling={false}
          style={[
            styles.suffix,
            getTypeStyle('body-xsm'),
            trailingIcon && styles.suffixWithIcon,
          ]}
          pointerEvents="none"
        >
          {suffixText}
        </Text>
      ) : null}
      {trailingIcon ? (
        trailingPress ? (
          <Pressable
            onPress={trailingPress}
            accessibilityRole="button"
            accessibilityLabel={trailingLabel}
            hitSlop={8}
            style={styles.iconButton}
          >
            {trailingIcon}
          </Pressable>
        ) : (
          <View style={styles.iconButton}>
            {trailingIcon}
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    color: colors.semantic.input.text,
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  inputWithSuffix: {
    paddingRight: 72,
  },
  inputWithSuffixAndIcon: {
    paddingRight: 100,
  },
  suffix: {
    position: 'absolute',
    right: 14,
    color: colors.semantic.input.textDisabled,
  },
  suffixWithIcon: {
    right: 44,
  },
  iconButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authInput: {
    height: 50,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  error: {
    borderColor: colors.semantic.input.border.error,
  },
});
