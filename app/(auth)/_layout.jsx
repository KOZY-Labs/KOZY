import { Stack } from 'expo-router';

export default function SignupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center', headerTitleAllowFontScaling: false, headerBackAllowFontScaling: false }}>
      <Stack.Screen
        name="login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ headerShown: false }}
      />
      {/* signUp has its own _layout, so the child route here is the group itself. */}
      <Stack.Screen
        name="signUp"
        options={{
          headerShown: false,
          headerBackTitleVisible: true,
          headerTitle: "",
        }}
      />
    </Stack>
  );
}
