import React from 'react';
import { Platform, Text } from 'react-native';
import { getTypeStyle } from '@/constants/typographyStyles';
import { colors } from '@/constants/colors';

// Android adds extra font padding above/below the line box, which clips text inside
// fixed-height containers (pills, DisplayInput rows) that were sized to iOS metrics.
const androidTextFix = Platform.OS === 'android' ? { includeFontPadding: false } : null;


export default function AppText({
  children,
  variant = 'body-md',
  color = 'primary', // fallback for semantic text colors
  textColor, // new prop for custom color
  style,
  ...props
}) {
  // Determine color: textColor prop > semantic.text > base
  let resolvedColor = textColor;
  if (!resolvedColor) {
    resolvedColor = colors.semantic?.text?.[color] || colors.base?.[color] || colors.semantic.text.primary;
  }
  return (
    <Text
      {...props}
      // Fixed-size design: the OS font-size setting must not inflate app text
      // (a 2x device font scale broke buttons, pills, and map markers).
      allowFontScaling={false}
      style={[
        {
          color: resolvedColor,
        },
        androidTextFix,
        getTypeStyle(variant),
        style,
      ]}
    >
      {children}
    </Text>
  );
}
