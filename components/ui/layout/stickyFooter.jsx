// Bottom-pinned CTA bar for long forms (edit profile, post steps, trust level):
// the primary action stays reachable without scrolling to the end. Screens add
// useStickyFooterPadding() to their scroll content so the last field clears it,
// and pass stickyFooterOffset(rows) as KeyboardAwareScrollView's bottomOffset so
// the focused input also clears the footer while the keyboard is up.
import { StyleSheet } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BUTTON_HEIGHT = 48;
const PADDING = 12;
// The global KeyboardToolbar (app/_layout.jsx) sits between keyboard and footer
// while the keyboard is up — the footer must clear it too. Matches the
// library's KEYBOARD_TOOLBAR_HEIGHT (not exported from the package root).
const KEYBOARD_TOOLBAR_HEIGHT = 42;
// Footer box plus breathing room; each extra stacked button adds its height + gap.
const FOOTER_CLEARANCE = 96;
const ROW_HEIGHT = BUTTON_HEIGHT + PADDING;

// `rows`: number of stacked buttons in the footer (primary on top, secondary
// below — two-button footers stack rather than sit side by side).
export function useStickyFooterPadding(rows = 1) {
  const insets = useSafeAreaInsets();
  return insets.bottom + FOOTER_CLEARANCE + (rows - 1) * ROW_HEIGHT;
}

// Space a KeyboardAwareScrollView must keep clear above the keyboard: the
// toolbar plus the footer (no home-indicator inset while the keyboard is up).
export function stickyFooterOffset(rows = 1) {
  return KEYBOARD_TOOLBAR_HEIGHT + PADDING + rows * BUTTON_HEIGHT + (rows - 1) * PADDING + PADDING;
}

// KeyboardStickyView rides above the keyboard on both platforms (Android
// edge-to-edge never resizes the window, so plain absolute positioning would be
// covered). With the keyboard open the home-indicator inset is hidden, so the
// footer shifts up by exactly that inset to sit flush on the keyboard.
export default function StickyFooter({ children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardStickyView
      // opened: positive = shift DOWN. Drop by the (now hidden) home-indicator
      // inset, rise by the toolbar that sits on top of the keyboard.
      offset={{ closed: 0, opened: insets.bottom - KEYBOARD_TOOLBAR_HEIGHT }}
      style={[styles.footer, { paddingBottom: insets.bottom + PADDING }, style]}
    >
      {children}
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: PADDING,
    gap: PADDING,
    backgroundColor: 'black',
  },
});
