import 'react-native-gesture-handler';
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

import { useColorScheme } from '@/hooks/use-color-scheme';
import { appTheme } from '@/constants/index';
import { AuthProvider } from '@/context/AuthContext';
import ScreenTracker from '@/components/navigation/screenTracker';

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000', 
    card: '#000000',      
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    OpenSans_400Regular: require('../assets/fonts/OpenSans-Regular.ttf'),
    OpenSans_600SemiBold: require('../assets/fonts/OpenSans-SemiBold.ttf'),
    OpenSans_700Bold: require('../assets/fonts/OpenSans-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider
        value={AppDarkTheme}
      >
        <RNEThemeProvider theme={appTheme}>
          <AuthProvider>
            <ScreenTracker />
            <Slot />
            <StatusBar style="auto" />
          </AuthProvider>
        </RNEThemeProvider>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}
