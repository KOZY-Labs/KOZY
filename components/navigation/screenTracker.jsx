import { useEffect } from 'react';
import { usePathname } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { trackLastScreen } from '@/lib/db/users';

// Records every screen the logged-in user visits to users/{uid}.lastScreenVisited
// (analytics + manual placement from Firestore). Renders nothing.
export default function ScreenTracker() {
  const pathname = usePathname();
  const { uid } = useAuth();

  useEffect(() => {
    if (!uid || !pathname || pathname === '/') return;
    trackLastScreen(uid, pathname).catch(() => {
      // Tracking must never break navigation.
    });
  }, [uid, pathname]);

  return null;
}
