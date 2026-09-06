// Expo push client: permissions, token registration, and display config.
// Server side: functions/src/notifications.js triggers + expoPush.js sender.
// JOOPI lessons applied here: dedupe BEFORE the network write, token cleared on
// logout (lib/auth logout()), and the recipientId check lives in the response
// handler (components/navigation/notificationsGate.jsx).
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { updateUserDoc } from '@/lib/db/users';

// EAS project id — required by getExpoPushTokenAsync in dev/standalone builds.
const EAS_PROJECT_ID = '854b4b93-cb0f-4a57-9039-2ebb824e9713';

// The chat room the user is currently looking at (set by the chat screen on
// focus/blur). A foreground push for that same chat is suppressed — the message
// is already on screen, so a banner would just be noise.
let activeChatId = null;

export function setActiveChat(chatId) {
  activeChatId = chatId ?? null;
}

// One-time display setup: how notifications behave while the app is foregrounded,
// and the single Android channel every chat push uses. Call once at app start.
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification?.request?.content?.data;
      const show = !(data?.chatId && data.chatId === activeChatId);
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Chat notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => {});
  }
}

// Ask permission (first call shows the OS prompt) and store the Expo push token on
// users/{uid}.fcmToken. Compares against the stored token BEFORE writing so repeat
// logins don't burn a Firestore write. Failure is silent-but-logged: push is an
// enhancement, never a login blocker.
export async function registerPushToken(uid, currentToken) {
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    // iOS simulators can't get a remote push token (Android emulators with Play
    // services can) — permission was still requested above so the prompt UX is
    // testable there; only the token fetch is skipped.
    if (!Device.isDevice && Platform.OS === 'ios') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    if (!token || token === currentToken) return;
    await updateUserDoc(uid, { fcmToken: token });
  } catch (e) {
    console.warn('[notifications] push registration failed:', e?.message ?? e);
  }
}
