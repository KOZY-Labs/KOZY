import { Stack } from "expo-router";
import { SignupProvider } from "@/context/SignupContext";

export default function SignupLayout() {
  return (
    <SignupProvider>
      <Stack 
        screenOptions={{
          headerShown: false,
          headerBackTitleVisible: false,
          headerTitleAlign: 'center',
          headerTitleAllowFontScaling: false,
          headerBackAllowFontScaling: false,
        }} />
    </SignupProvider>
  );
}
