import { Stack } from 'expo-router';

export default function SignupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false }}>
      <Stack.Screen
        name="login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="signUp/email"
        options={{
          headerShown: false,
          headerBackTitleVisible: true,
          headerTitle: "",
        }}
      />
    </Stack>
  );
}
