// Bottom-pinned CTA bar for long forms (edit profile, post steps, trust level):
// the primary action stays reachable without scrolling to the end. Screens add
// useStickyFooterPadding() to their scroll content so the last field clears it.
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Footer box (paddingTop + 48px button + paddingBottom) plus breathing room;
// each extra stacked button adds its height + the row gap.
const FOOTER_CLEARANCE = 96;
const ROW_HEIGHT = 48 + 12;

// `rows`: number of stacked buttons in the footer (primary on top, secondary
// below — two-button footers stack rather than sit side by side).
export function useStickyFooterPadding(rows = 1) {
  const insets = useSafeAreaInsets();
  return insets.bottom + FOOTER_CLEARANCE + (rows - 1) * ROW_HEIGHT;
}

export default function StickyFooter({ children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    backgroundColor: 'black',
  },
});
