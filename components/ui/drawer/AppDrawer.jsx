import { forwardRef, useMemo } from 'react';
import { View, StyleSheet, Keyboard, Pressable } from 'react-native';
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
      enableDynamicSizing,
    },
    ref
  ) => {

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints ?? ['70%', '80%']}
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
            paddingHorizontal: 22,
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
        
        <BottomSheetScrollView style={ styles.sheetContainer } keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>
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

            {/* Scrollable Content */}
            <View style={[styles.content, {marginVertical: title ? 50 : 0}]}>
                {children}
            </View>
            <View style={{ marginBottom: 60 }}>
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
          </Pressable>
        </BottomSheetScrollView>
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
  sheetContainerCenter: {
    display: 'flex',
    justifyContent: 'center',
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