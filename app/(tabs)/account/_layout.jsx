import { Stack } from 'expo-router';

import HeaderBackButton from '@/components/navigation/headerBackButton';

export default function AccountStack() {
  return (
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false, headerBackButtonDisplayMode: 'minimal', headerBackVisible: false, headerLeft: () => <HeaderBackButton fallback="/(tabs)/account" /> }}>
      <Stack.Screen name="index" options={{ title: 'Account' }} />
      <Stack.Screen name="trustLevelInfo" 
        options={{ 
          title: '',
          headerShown: true,
      }} />
      <Stack.Screen name="editProfile" 
        options={({ route }) => ({
          title: 'Edit Profile',
          headerShown: true,
          headerLeft: () => <HeaderBackButton backTo={route?.params?.backTo} fallback="/(tabs)/account" />,
      })} />
      <Stack.Screen name="notification"
        options={{
          title: 'Notifications',
          headerShown: true,
      }} />
      <Stack.Screen name="security"
        options={{
          title: 'Account & Security',
          headerShown: true,
      }} />
      <Stack.Screen name="contactUs" 
        options={({ route }) => ({ 
          title: 'Contact Us',
          headerShown: true,
          headerLeft: () => <HeaderBackButton backTo={route?.params?.backTo} fallback="/(tabs)/account" />,
      })} />
      <Stack.Screen name="savedList/index"
        options={{ 
          title: 'Saved Listings',
          headerShown: true,
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
        }}
      />
      <Stack.Screen name="myListings/index" 
        options={{ 
          title: 'My Listings',
          headerShown: true,
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
        }}
      />
    </Stack>
  );
}
