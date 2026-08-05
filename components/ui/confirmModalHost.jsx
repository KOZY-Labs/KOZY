// Global host for ConfirmModal so imperative code (gates, helpers outside React)
// can show the app-styled confirmation dialog instead of the native Alert.
// Mount <ConfirmModalHost /> once in app/_layout.jsx, then call showConfirmModal().
import { useEffect, useState } from 'react';

import ConfirmModal from '@/components/ui/confirmModal';

let presentRef = null;

// options: { title, message, bullets, primaryText, secondaryText, tertiaryText,
//            onPrimary, onSecondary, onTertiary }
export function showConfirmModal(options) {
  if (!presentRef) {
    console.warn('[confirmModalHost] ConfirmModalHost is not mounted.');
    return;
  }
  presentRef(options);
}

// Single-button convenience — the app-styled replacement for Alert.alert(title, message).
export function showAlertModal({ title, message, bullets, buttonText = 'OK', onPress } = {}) {
  showConfirmModal({
    title,
    message,
    bullets,
    primaryText: buttonText,
    onPrimary: onPress,
  });
}

export default function ConfirmModalHost() {
  const [options, setOptions] = useState(null);

  useEffect(() => {
    presentRef = setOptions;
    return () => {
      if (presentRef === setOptions) presentRef = null;
    };
  }, []);

  if (!options) return null;

  const close = () => setOptions(null);

  return (
    <ConfirmModal
      visible
      title={options.title}
      message={options.message}
      bullets={options.bullets}
      primaryText={options.primaryText}
      secondaryText={options.secondaryText}
      tertiaryText={options.tertiaryText}
      onPrimary={() => {
        close();
        options.onPrimary?.();
      }}
      onSecondary={() => {
        close();
        options.onSecondary?.();
      }}
      onTertiary={() => {
        close();
        options.onTertiary?.();
      }}
      onRequestClose={close}
    />
  );
}
