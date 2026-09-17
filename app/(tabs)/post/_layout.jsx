import { Stack } from 'expo-router';

import HeaderBackButton from '@/components/navigation/headerBackButton';
import { ListingDraftProvider } from '@/context/ListingDraftContext';

export default function PostStack() {
  return (
    <ListingDraftProvider>
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false, headerBackButtonDisplayMode: 'minimal', headerBackVisible: false, headerLeft: () => <HeaderBackButton fallback="/(tabs)/post" /> }}>
      <Stack.Screen name="index" options={{ title: 'Post'}} />
      <Stack.Screen name="stepOne" 
        options={{
        title:'',
        headerShown: true,
      }} />
      <Stack.Screen name="stepTwo" 
        options={{
        title:'',
        headerShown: true,
      }} />
      <Stack.Screen name="stepThree" 
        options={{
        title:'',
        headerShown: true,
      }} />
      <Stack.Screen name="stepFour" 
        options={{
        title:'',
        headerShown: true,
      }} />
      <Stack.Screen name="editProfile"
        options={{
        title: 'Edit Profile',
        headerShown: true,
      }} />
      <Stack.Screen name="previewListing"
        options={{
        title:'',
        headerShown: true,
      }} />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: '',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="uploadedPost/[id]" 
        options={{ 
          title: '',
          headerShown: false,
        }} 
      />
      <Stack.Screen
        name="uploadedPost/detail/[id]"
        options={{
          title: '',
          headerShown: false,
        }}
      />
    </Stack>
    </ListingDraftProvider>
  );
}