import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';

export default function AppIconButton({
  icon,
  size = 'lg',
  type = 'primary',   // primary | secondary | ghost | bare
  state = 'normal',   // normal | disabled | pressed
  // Drop shadow behind the glyph (same treatment as the reel overlay text) so
  // icons floating over video/photos stay visible on bright frames.
  shadow = false,
  onPress,
  accessibilityLabel,
  ...props
}) {
  const isDisabled = state === 'disabled';
  const isBare = type === 'bare';

  const colorSet =
    colors.semantic.button[type][isDisabled ? 'disabled' : state];

  const hasBorder = colorSet.border !== 'transparent';

  const iconColor = colorSet.text;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        isBare && styles.bareSize,
        {
          backgroundColor: colorSet.bg,
          borderColor: colorSet.border,
          borderWidth: hasBorder ? 1 : 0,
          opacity: pressed && !isDisabled ? 0.85 : 1,
        },
      ]}
    >
      {/* 
        I clone the icon element here to inject semantic color & size based on button type/state (primary, secondary, disabled, etc).
        Icon color/size are injected here to keep button + icon styling consistent across states.
        Do not pass color/size directly to the icon.
      */}
      <View style={styles.iconWrapper}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon, {
              color: iconColor,
              stroke: iconColor,
              style: [{ color: iconColor }, shadow && styles.glyphShadow, icon.props.style],
              size: size === 'lg' ? 25 : 16,
            })
          : icon}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },

  /* ---------- Size ---------- */
  // Keeps the icon-to-box ratio of the original 20px icon in a 44px box.
  lg: {
    width: 52,
    height: 52,
  },

  sm: {
    width: 32,
    height: 32,
  },

  /* ---------- Bare ---------- */
  bareSize: {
    width: 'auto',
    height: 'auto',
    padding: 0,
  },

  /* ---------- Icon ---------- */
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Vector icons render as text glyphs, so text shadow works on them.
  glyphShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

