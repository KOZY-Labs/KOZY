import { forwardRef } from 'react';
import { TextInput } from 'react-native';
import { BottomSheetTextInput, useBottomSheetInternal } from '@gorhom/bottom-sheet';

// Sheet-aware TextInput. @gorhom sheets only react to the keyboard (keyboardBehavior)
// for inputs rendered through THEIR BottomSheetTextInput — a plain TextInput inside a
// drawer leaves the sheet sitting behind the keyboard. This detects the sheet context
// (unsafe lookup → null outside a sheet) and picks the right implementation, so
// TextField/TextArea work everywhere without per-screen wiring.
const AdaptiveTextInput = forwardRef(function AdaptiveTextInput(props, ref) {
  const inBottomSheet = useBottomSheetInternal(true) != null;
  const Input = inBottomSheet ? BottomSheetTextInput : TextInput;
  return <Input ref={ref} {...props} />;
});

export default AdaptiveTextInput;
