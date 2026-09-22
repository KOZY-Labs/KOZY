// Push notification lifecycle, mounted once in app/_layout.jsx (like ScreenTracker):
//  - configures display behavior + the Android channel at startup
//  - registers the push token once per signed-in uid
//  - routes notification taps to the chat room, including the cold-start tap
//    (app launched by the notification), with a one-shot guard so a remount
//    can't re-handle the same response (JOOPI's didHandleInitialNotification
//    pattern) and a recipient check so a device that switched accounts doesn't
//    open another user's chat.
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { configureNotifications, registerPushToken } from '@/lib/notifications';
import { hasIndexResolved, setPendingRoute } from '@/lib/pendingRoute';

export default function NotificationsGate() {
  const { uid, profile } = useAuth();
  const navReady = !!useRootNavigationState()?.key;

  useEffect(() => {
    configureNotifications();
  }, []);

  // Register once per uid, after the profile doc is loaded (its fcmToken feeds the
  // pre-write dedupe). Re-renders with the same uid are no-ops via the ref.
  const registeredUidRef = useRef(null);
  useEffect(() => {
    if (!uid || !profile || registeredUidRef.current === uid) return;
    registeredUidRef.current = uid;
    registerPushToken(uid, profile.fcmToken);
  }, [uid, profile]);

  // Keep the latest uid readable from the stable listener below.
  const uidRef = useRef(uid);
  uidRef.current = uid;

  const handledColdStartRef = useRef(false);
  useEffect(() => {
    if (!navReady) return undefined;

    const routeFromResponse = (response) => {
      const data = response?.notification?.request?.content?.data;
      if (!data?.chatId) return null;
      // Payload addressed to someone else (account switched on this device) — drop.
      if (data.recipientId && data.recipientId !== uidRef.current) return null;
      return `/(tabs)/chat/${data.chatId}`;
    };
    const openFromResponse = (response) => {
      const route = routeFromResponse(response);
      if (route) router.push(route);
    };

    // Cold start: the tap that launched the app is delivered via the last-response
    // API, not the listener. One-shot — never re-run on remounts. Until app/index
    // has placed the user (lastScreenVisited restore), a push here would be
    // overridden by that redirect — park the route for index to consume instead.
    if (!handledColdStartRef.current) {
      handledColdStartRef.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (!response) return;
          const data = response?.notification?.request?.content?.data;
          if (!data?.chatId) return;
          if (hasIndexResolved()) {
            openFromResponse(response);
            return;
          }
          // uid isn't known yet this early — index re-checks the recipient.
          setPendingRoute({ chatId: data.chatId, recipientId: data.recipientId ?? null });
        })
        .catch(() => {});
    }

    const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => sub.remove();
  }, [navReady]);

  return null;
}
