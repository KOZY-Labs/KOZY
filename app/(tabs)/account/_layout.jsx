import { Stack, router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AccountStack() {
  return (
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false }}>
      <Stack.Screen name="index" options={{ title: 'Account' }} />
      <Stack.Screen name="trustLevelInfo" 
        options={{ 
          title: '',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
      }} />
      <Stack.Screen name="editProfile" 
        options={({ route }) => ({
          title: 'Edit Profile',
          headerShown: true,
          headerBackVisible: false,
          headerBackTitleVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                const backTo = route?.params?.backTo;

                if (typeof backTo === 'string' && backTo.length > 0) {
                  router.replace(backTo);
                  return;
                }

                if (router.canGoBack()) {
                  router.back();
                  return;
                }

                router.replace('/(tabs)/account');
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </Pressable>
          ),
      })} />
      <Stack.Screen name="notification" 
        options={{ 
          title: 'Notifications',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
      }} />
      <Stack.Screen name="privacyPolicy" 
        options={{ 
          title: 'Privacy Policy',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
      }} />
      <Stack.Screen name="contactUs" 
        options={({ route }) => ({ 
          title: 'Contact Us',
          headerShown: true,
          headerBackVisible: false,
          headerBackTitleVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                const backTo = route?.params?.backTo;

                if (typeof backTo === 'string' && backTo.length > 0) {
                  router.replace(backTo);
                  return;
                }

                if (router.canGoBack()) {
                  router.back();
                  return;
                }

                router.replace('/(tabs)/account');
              }}
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={24} color={'#ffffff'} />
            </Pressable>
          )
      })} />
      <Stack.Screen name="deleteAccount"
        options={{
          title: 'Delete Account',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
      }} />
      <Stack.Screen name="savedList/index"
        options={{ 
          title: 'Saved Listings',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
      }} />
      <Stack.Screen name="savedList/[id]" 
        options={{ 
          title: '',
          headerShown: false,
        }}
      />
      <Stack.Screen name="savedList/detail/[id]" 
        options={{ 
          title: '',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
        }}
      />
      <Stack.Screen name="myListings/index" 
        options={{ 
          title: 'My Listings',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
        }}
      />
      <Stack.Screen name="myListings/[id]" 
        options={{ 
          title: '',
          headerShown: false,
        }}
      />
      <Stack.Screen name="myListings/detail/[id]" 
        options={{ 
          title: '',
          headerShown: true,
          headerBackVisible: true,
          headerBackTitleVisible: false
        }}
      />
    </Stack>
  );
}
