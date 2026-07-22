import { Redirect } from "expo-router";

import { useAuth } from "@/context/AuthContext";

// Auth flow paths are never a valid restore target.
const AUTH_PATHS = /^\/(login|forgot-password|signUp)/;

// Browse-first: guests land on the home feed. Logged-in users are placed on their
// lastScreenVisited (tracked by ScreenTracker; manually overridable in Firestore).
export default function TabsIndex() {
  const { initializing, isLoggedIn, profile } = useAuth();

  if (initializing) return null;

  const last = profile?.lastScreenVisited;
  if (
    isLoggedIn &&
    typeof last === "string" &&
    last.startsWith("/") &&
    !AUTH_PATHS.test(last)
  ) {
    return <Redirect href={last} />;
  }

  return <Redirect href="/(tabs)/home" />;
}
