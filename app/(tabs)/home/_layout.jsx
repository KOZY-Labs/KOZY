import { Stack } from 'expo-router';

export default function HomeStack() {
  return (
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false }}>
      <Stack.Screen name="index" 
        options={{ 
          title: 'Home',
         }} 
        />
      <Stack.Screen name="search" options={{
        title: 'Search',
        headerShown: false,
        animation: 'slide_from_right',
      }} />
      <Stack.Screen name="[id]" options={{ 
        title: '',
        headerShown: true,
        headerBackVisible: true,    
      }} />
    </Stack>
  );
}
