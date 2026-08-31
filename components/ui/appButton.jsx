import React from 'react';
import { ActivityIndicator, Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
import { getTypeStyle } from '@/constants/typographyStyles';

const buttonTextVariantMap = {
  lg: 'button-sm',
  sm: 'button-xsm',
};

export default function AppButton({
  text,
  size = 'lg',
  type = 'primary',   // primary | secondary | ghost | bare
  state = 'normal',   // normal | pressed | disabled
  onPress,
  underline = false,
  loading = false,
  loadingLabel = 'Updating',
  style,
  ...props
}) {
  const isDisabled = state === 'disabled' || loading;

  const colorSet =
    colors.semantic.button[type][isDisabled ? 'disabled' : state];

  const hasBorder = colorSet.border !== 'transparent';
  const isBare = type === 'bare';
  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      onPress={onPress}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={loading ? `${loadingLabel}: ${text}` : props.accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        isBare && styles.barePadding,
        {
          backgroundColor: colorSet.bg,
          borderColor: colorSet.border,
          borderWidth: hasBorder ? 1 : 0,
          opacity: pressed && !isDisabled ? 0.85 : 1,
        },
        style
      ]}
    >
      <View style={styles.content}>
        <View style={styles.labelRow}>
          {loading && (
            <ActivityIndicator
              size="small"
              color={colorSet.text}
              style={styles.spinner}
            />
          )}
          <Text
            allowFontScaling={false}
            style={[
              getTypeStyle(buttonTextVariantMap[size] ?? 'button-lg'),
              { color: colorSet.text },
            ]}
          >
            {text}
          </Text>
        </View>

        {underline && (
          <View
            style={[styles.underline, { backgroundColor: colorSet.text }]}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    width: '100%',
    maxWidth: 300,
    marginHorizontal: 'auto',

    // ✅ iOS shadow
    shadowColor: "#1F2937", 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, 
    shadowRadius: 2,

    // ✅ Android shadow
    elevation: 2,
  },

  lg: {
    height: 52,
    paddingHorizontal: 32,
  },

  sm: {
    height: 32,
    paddingHorizontal: 16,
  },

  barePadding: {
    width: 'auto',
    height: 'auto',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  spinner: {
    marginRight: 8,
  },

  underline: {
    alignSelf: 'stretch',
    height: 1.5,
    marginTop: 4,
  },
});
