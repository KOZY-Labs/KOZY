import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { ThemeProvider as RNEThemeProvider, } from 'react-native-elements';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { appTheme } from '@/constants/index';
import { AuthProvider } from '@/context/AuthContext';
import { ChatBadgeProvider } from '@/context/ChatBadgeContext';
import ScreenTracker from '@/components/navigation/screenTracker';
import NotificationsGate from '@/components/navigation/notificationsGate';
import SplashGate from '@/components/ui/splashGate';
import ConfirmModalHost from '@/components/ui/confirmModalHost';

// Hold the native splash until fonts are ready; SplashGate then takes over with
// the matching JS splash so there is no flash between the two.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

// Crash + error reporting. No-op until EXPO_PUBLIC_SENTRY_DSN is set (the DSN is
// public client config, like the Firebase keys). Breadcrumbs (navigation, network,
// console) are free context attached to error events — only errors count against
// the 5k/month free quota. Tracing stays off (separate quota, not needed yet).
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
});

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000', 
    card: '#000000',      
  },
};

function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    OpenSans_400Regular: require('../assets/fonts/OpenSans-Regular.ttf'),
    OpenSans_600SemiBold: require('../assets/fonts/OpenSans-SemiBold.ttf'),
    OpenSans_700Bold: require('../assets/fonts/OpenSans-Bold.ttf'),
  });

  // Fonts are ready: drop the native splash. SplashGate keeps the same artwork
  // on screen while auth resolves.
  useEffect(() => {
    if (fontsLoaded) ExpoSplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider
        value={AppDarkTheme}
      >
        <RNEThemeProvider theme={appTheme}>
          <AuthProvider>
            <ChatBadgeProvider>
              <SplashGate>
                <ScreenTracker />
                <NotificationsGate />
                <Slot />
                <ConfirmModalHost />
                <StatusBar style="auto" />
              </SplashGate>
            </ChatBadgeProvider>
          </AuthProvider>
        </RNEThemeProvider>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap adds the top-level error boundary + touch-event breadcrumbs.
export default Sentry.wrap(RootLayout);
