import { Platform } from 'react-native';

// Android edge-to-edge leaves insets.top at the bare status-bar height, which makes
// tab-screen headers look glued to the top — give them a little extra air. iOS notch
// insets are already generous.
export const TOP_INSET_EXTRA = Platform.OS === 'android' ? 8 : 0;

// Floating tab bar geometry — must match the tabBarStyle in app/(tabs)/_layout.jsx.
export const TAB_BAR_HEIGHT = 56;
export const TAB_BAR_BOTTOM_OFFSET = 10;

// Bottom content padding for scroll views that run underneath the floating tab bar:
// the bar's own footprint plus a 24px gap so the last row clears it on any device.
export const tabBarClearance = (insets) =>
  insets.bottom + TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT + 24;
