import { forwardRef } from 'react';
import { Platform, TextInput } from 'react-native';
import { BottomSheetTextInput, useBottomSheetInternal } from '@gorhom/bottom-sheet';

// Android EditText ships default vertical padding and extra font padding; inside our
// fixed-height inputs (TextField height 40) that clips the text. Callers' styles come
// after, so multiline fields can still override (e.g. TextArea's top alignment).
const androidInputFix =
  Platform.OS === 'android'
    ? { includeFontPadding: false, paddingVertical: 0, textAlignVertical: 'center' }
    : null;

// Sheet-aware TextInput. @gorhom sheets only react to the keyboard (keyboardBehavior)
// for inputs rendered through THEIR BottomSheetTextInput — a plain TextInput inside a
// drawer leaves the sheet sitting behind the keyboard. This detects the sheet context
// (unsafe lookup → null outside a sheet) and picks the right implementation, so
// TextField/TextArea work everywhere without per-screen wiring.
const AdaptiveTextInput = forwardRef(function AdaptiveTextInput({ style, ...props }, ref) {
  const inBottomSheet = useBottomSheetInternal(true) != null;
  const Input = inBottomSheet ? BottomSheetTextInput : TextInput;
  return <Input ref={ref} allowFontScaling={false} {...props} style={[androidInputFix, style]} />;
});

export default AdaptiveTextInput;
