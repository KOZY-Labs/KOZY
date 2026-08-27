import { forwardRef } from 'react';
import { View, StyleSheet, Keyboard, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { colors } from '@/constants/colors';

const AppDrawer = forwardRef(
  (
    {
      title,
      children,
      primaryAction,
      secondaryAction,
      primaryActionText,
      secondaryActionText,
      description,
      align,
      primaryDisabled,
      secondaryDisabled,
      snapPoints,
      keyboardBehavior,
      keyboardBlurBehavior,
      android_keyboardInputMode,
      // OFF by default: @gorhom v5 defaults dynamic sizing ON, which re-measures and
      // re-snaps the sheet whenever content re-renders (e.g. picking a dropdown value
      // yanks it to the top) and sizes it to content with the bottom row clipped.
      enableDynamicSizing = false,
      // false for wheel-picker drawers: the sheet content must NOT scroll, or dragging
      // the wheel scrolls the whole sheet along with it.
      scrollable = true,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();

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
        <View style={[styles.content, {marginVertical: title ? 50 : 0}]}>
            {children}
        </View>
        <View style={{ marginTop: 8 }}>
          {/* Footer */}
          {primaryAction && (
              <View style={[styles.footer, { marginBottom: 12 }]}>
                  <AppButton
                    text={primaryActionText || "Save"}
                    onPress={primaryAction}
                    type="primary"
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
        <View style={{ height: insets.bottom + 16 }} />
      </>
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        // SINGLE snap point by default: with two snaps the sheet sizes its scroll
        // content against the LARGEST one, so at the smaller snap the bottom slice
        // (Save button) sits off-screen and can never be scrolled into view.
        snapPoints={snapPoints ?? ['75%']}
        enableDynamicSizing={enableDynamicSizing}
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
          <BottomSheetScrollView style={styles.sheetContainer} keyboardShouldPersistTaps="handled">
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
