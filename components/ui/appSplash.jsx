import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import AppLogo from "@/components/ui/appMainLogo";
import { baseColors } from "@/constants/colors/base";

// Full-screen brand splash. Mirrors the native splash configured in app.json
// (Horizontal-logo on the accent blue) so the hand-off between the native
// splash and the JS app is seamless.
export default function AppSplash() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppLogo width={220} height={48} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: baseColors.accent,
  },
});
