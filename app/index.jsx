import { Redirect } from "expo-router";

// Browse-first: everyone (guests included) lands on the home feed.
// Auth-only actions surface their own sign-up/log-in gates.
export default function TabsIndex() {
  return <Redirect href="/(tabs)/home" />;
}
