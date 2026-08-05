import { useEffect, useRef } from "react";
import { useSignup } from "@/context/SignupContext";
import { router } from "expo-router";
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import AppText from "@/components/ui/appText";
import AppButton from "@/components/ui/appButton";
import { LoginBackground } from "@/components/ui/loginBackground";
import AppHeader from "@/components/ui/appHeader";
import AuthCard from "@/components/ui/authInputCard";
import AppLogo from "@/components/ui/appMainLogo";
import { colors } from "@/constants/colors";
import { resendVerificationEmail, reloadUser, isEmailVerified } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth/errors";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // stop auto-polling after 5 minutes

// Firebase verifies email via a link (not a 6-digit code). The account was created on the
// previous step, which sent the link. Here we poll the server every 5s and, the moment the
// link is clicked, auto-advance to the success screen — no manual button needed.
export default function Verify() {
  const insets = useSafeAreaInsets();
  const { signup } = useSignup();
  const navigatedRef = useRef(false); // guard so poll + foreground checks can't double-navigate

  const goNext = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace("/(auth)/signUp/verifyComplete");
  };

  const checkVerified = async () => {
    if (navigatedRef.current) return true;
    try {
      await reloadUser();
      if (isEmailVerified()) {
        goNext();
        return true;
      }
    } catch {
      // transient error (e.g. network) — keep polling
    }
    return false;
  };

  // Poll every 5s while this screen is mounted.
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(async () => {
      const done = await checkVerified();
      if (done) {
        clearInterval(id);
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(id);
        Alert.alert(
          "Still not verified",
          "Please open the verification link in your email, or resend it."
        );
      }
    }, POLL_INTERVAL_MS);

    checkVerified(); // also check immediately on mount
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check the instant the user returns from their email app.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkVerified();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      Alert.alert(
        "Email sent",
        "A new verification link has been sent to your email. If you don't see it, check your spam folder."
      );
    } catch (e) {
      // Show the real reason (e.g. too-many-requests) instead of a generic message.
      Alert.alert("Couldn't resend", authErrorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* Background shapes */}
        <LoginBackground />
        <AppHeader showBack />
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={-80}
        >
          <View style={[styles.content, { paddingBottom: insets.bottom }]}>
            <View style={styles.topContent}>
              <AppLogo />
            </View>
            <View style={styles.midContent}>
              <AuthCard
                title="Check Your Email"
                description={`We’ve sent a verification link to ${
                  signup.email || "your email"
                }. Open it to verify — this screen updates automatically.`}
              />
              <View style={styles.statusRow}>
                <ActivityIndicator color={colors.base.accent} />
                <AppText variant="body-sm" color="primary" style={styles.statusText}>
                  Waiting for verification…
                </AppText>
              </View>
            </View>
            <View style={styles.footerContent}>
              <AppButton
                text="Resend Email"
                onPress={handleResend}
                type="bare"
                underline
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "white",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  topContent: {
    height: 100,
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-end',
  },
  midContent: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  statusText: {
    marginLeft: 4,
  },
  footerContent: {
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  }
});
