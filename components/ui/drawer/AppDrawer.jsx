import { forwardRef, useEffect, useRef } from 'react';
import { View, StyleSheet, Keyboard, Pressable, useWindowDimensions } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { colors } from '@/constants/colors';

// Backdrop strip kept above the sheet (below the status bar) so there is always
// somewhere to tap to dismiss.
const TOP_CLEARANCE = 100; // header (~44) + a comfortable tap strip

const AppDrawer = forwardRef(
  (
    {
      title,
      children,
      primaryAction,
      secondaryAction,
      primaryActionText,
      primaryType = 'primary', // AppButton type for the primary CTA (e.g. 'danger')
      secondaryActionText,
      description,
      align,
      primaryDisabled,
      secondaryDisabled,
      snapPoints,
      // Keyboard handling ON by default: every drawer with a text input lifts above
      // the keyboard (inputs render via AdaptiveTextInput → BottomSheetTextInput, which
      // is what makes these behaviors fire). Callers can still override.
      keyboardBehavior = 'interactive',
      keyboardBlurBehavior = 'restore',
      android_keyboardInputMode = 'adjustResize',
      // Default: size the sheet to its content (no wasted space under short drawers),
      // capped so a strip of backdrop always stays above it (tap to dismiss, clear of
      // the screen header) — 75% of the screen, or whatever fits above the keyboard
      // when one is open. Taller content scrolls inside the sheet. Passing
      // explicit snapPoints opts a drawer OUT of dynamic sizing (fixed height wins) —
      // mixing the two is what previously caused clipped/mispositioned sheets.
      enableDynamicSizing,
      // false for wheel-picker drawers: the sheet content must NOT scroll, or dragging
      // the wheel scrolls the whole sheet along with it.
      scrollable = true,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const dynamicSizing = enableDynamicSizing ?? !snapPoints;
    const { height: windowHeight } = useWindowDimensions();
    const keyboard = useKeyboardState();
    const keyboardHeight = keyboard.isVisible ? keyboard.height : 0;
    const maxContentSize = Math.min(
      windowHeight * 0.75,
      windowHeight - keyboardHeight - insets.top - TOP_CLEARANCE
    );

    // When the keyboard opens the sheet shrinks to fit above it; the input that
    // opened the keyboard is at the end of every text drawer we have, so bring the
    // end into view once the resize has settled.
    const scrollRef = useRef(null);
    useEffect(() => {
      if (!keyboard.isVisible || !scrollable) return undefined;
      const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      return () => clearTimeout(timer);
    }, [keyboard.isVisible, scrollable]);

    const content = (
      <>
        {/* Header */}
        {title && (
          <View style={styles.header}>
            <AppText variant="headline-md" style={ align == "center" ? {textAlign: 'center'} : null }>{title}</AppText>
          </View>)}

        {/* Description */}
        {description &&
        <View style={styles.description}>
            <AppText variant="body-sm" style={ align == "center" ? {textAlign: 'center'} : null }>{description}</AppText>
        </View>}

        {/* Content */}
        <View style={[styles.content, { marginTop: title || description ? 24 : 0, marginBottom: 20 }]}>
            {children}
        </View>
        <View>
          {/* Footer */}
          {primaryAction && (
              <View style={[styles.footer, { marginBottom: 12 }]}>
                  <AppButton
                    text={primaryActionText || "Save"}
                    onPress={primaryAction}
                    type={primaryType}
                    state={primaryDisabled ? "disabled" : "normal"}
                  />
              </View>
          )}
          {secondaryAction && (
              <View style={styles.footer}>
                  <AppButton
                    text={secondaryActionText || "Save"}
                    onPress={secondaryAction}
                    type="secondary"
                    state={secondaryDisabled ? "disabled" : "normal"}
                  />
              </View>
          )}
        </View>
        {/* Bottom clearance as a REAL view, not container padding — the sheet's
            scroll measurement reliably includes it, so the footer always clears
            the home indicator. */}
        <View style={{ height: insets.bottom + 8 }} />
      </>
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={dynamicSizing ? undefined : snapPoints}
        enableDynamicSizing={dynamicSizing}
        maxDynamicContentSize={maxContentSize}
        keyboardBehavior={keyboardBehavior}
        keyboardBlurBehavior={keyboardBlurBehavior}
        android_keyboardInputMode={android_keyboardInputMode}
        onClose={Keyboard.dismiss}
        enablePanDownToClose
        // Don't let dragging the content (e.g. the wheel Picker) move the sheet —
        // only the handle drag / backdrop tap should dismiss it.
        enableContentPanningGesture={false}
        backgroundStyle={{
            backgroundColor: colors.semantic.bottomSheet.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
        }}
        backdropComponent={(props) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="close"
            />
        )}
        handleIndicatorStyle ={{ backgroundColor: colors.semantic.bottomSheet.handleIndicator }}
      >
        {scrollable ? (
          <BottomSheetScrollView ref={scrollRef} style={styles.sheetContainer} keyboardShouldPersistTaps="handled">
            <Pressable onPress={Keyboard.dismiss}>{content}</Pressable>
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView style={styles.sheetContainer}>{content}</BottomSheetView>
        )}
      </BottomSheet>
    );
  }
);

AppDrawer.displayName = 'AppDrawer';

export default AppDrawer;

const styles = StyleSheet.create({
  sheetContainer: {
    paddingTop: 12,
    paddingHorizontal: 46,
  },
  description: {
    marginTop: 12,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
