// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { OpaqueColorValue } from 'react-native';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the Icons Directory: https://icons.expo.fyi
 * - see SF Symbols in the SF Symbols app
 */
const MAPPING = {
  'house.fill': 'home',
  'bubble.left.fill': 'chat-bubble',
  'plus.square': 'add-box',
  'person.fill': 'person',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
};

/**
 * An icon component that uses native SF Symbols on iOS,
 * and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}) {
  return (
    <MaterialIcons
      name={MAPPING[name]}
      size={size}
      color={color}
      style={style}
    />
  );
}
