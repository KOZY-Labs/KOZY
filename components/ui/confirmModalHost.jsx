// Global host for ConfirmModal so imperative code (gates, helpers outside React)
// can show the app-styled confirmation dialog instead of the native Alert.
// Mount <ConfirmModalHost /> once in app/_layout.jsx, then call showConfirmModal().
//
// Dialogs are queued, not clobbered: a request made while another dialog is visible
// (e.g. a timer-driven alert racing a user-triggered one) shows after it closes, and
// requests made before the host mounts are held and flushed on mount.
import { useEffect, useState } from 'react';

import ConfirmModal from '@/components/ui/confirmModal';

let enqueueRef = null;
let hostHasMounted = false;
const preMountQueue = [];

// options: { title, message, bullets, primaryText, secondaryText, tertiaryText,
//            onPrimary, onSecondary, onTertiary }
export function showConfirmModal(options) {
  if (!enqueueRef) {
    // Queue only while waiting for the FIRST mount (app startup). After the host has
    // unmounted (root teardown), drop with a diagnostic — replaying stale dialogs on
    // a later remount would be worse than losing them.
    if (!hostHasMounted) {
      preMountQueue.push(options);
    } else {
      console.warn('[confirmModalHost] ConfirmModalHost is not mounted; dialog dropped.');
    }
    return;
  }
  enqueueRef(options);
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
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const enqueue = (options) => setQueue((current) => [...current, options]);
    enqueueRef = enqueue;
    hostHasMounted = true;
    preMountQueue.splice(0).forEach(enqueue);
    return () => {
      if (enqueueRef === enqueue) enqueueRef = null;
    };
  }, []);

  const options = queue[0];
  if (!options) return null;

  // Closing reveals the next queued dialog, if any.
  const close = () => setQueue((current) => current.slice(1));

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
