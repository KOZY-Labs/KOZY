import { Keyboard, Pressable } from 'react-native';

// Wrap a scroll view's content in this so tapping any empty area closes the
// keyboard. Needed because our forms set keyboardShouldPersistTaps (so buttons
// work while typing), which also turns off the default tap-to-dismiss. Buttons
// and inputs inside still receive their own taps — the Pressable only fires
// when nothing else claimed the touch.
export default function DismissKeyboard({ children, style }) {
  return (
    <Pressable style={[{ flexGrow: 1 }, style]} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );
}
