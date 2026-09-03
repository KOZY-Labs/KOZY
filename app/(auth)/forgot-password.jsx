// Forgot-password: collects an email and sends the Firebase reset link. The new
// password itself is entered on Firebase's hosted reset page (same philosophy as
// email verification in signUp/verify — no in-app oobCode handling).
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import TextField from "@/components/ui/input/textField";
import AppButton from "@/components/ui/appButton";
import FormField from "@/components/ui/form/formField";
import ErrorMessage from "@/components/ui/form/errorMessage";
import { colors } from "@/constants/colors";
import { LoginBackground } from "@/components/ui/loginBackground";
import AuthCard from "@/components/ui/authInputCard";
import AppLogo from "@/components/ui/appMainLogo";
import AppHeader from "@/components/ui/appHeader";
import { requestPasswordReset } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth/errors";
import { showAlertModal } from "@/components/ui/confirmModalHost";

export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // A stale auth error shouldn't follow the user back to this screen.
  useFocusEffect(
    useCallback(() => {
      return () => setAuthError(null);
    }, [])
  );

  const validate = () => {
    if (!email) {
      setFieldError("Email is required.");
      return false;
    }
    if (!email.includes("@")) {
      setFieldError("Enter a valid email address.");
      return false;
    }
    setFieldError(null);
    return true;
  };

  // On a resend, setSent(true) is a no-op — an alert is the only visible feedback.
  const markSent = () => {
    if (sent) {
      showAlertModal({
        title: "Email sent",
        message:
          "We’ve sent another reset link. If you don’t see it, check your spam folder.",
      });
    }
    setSent(true);
  };

  const handleSend = async () => {
    if (submitting) return;
    // Clear before validating so the field error and the auth pill never show together.
    setAuthError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      markSent();
    } catch (e) {
      // Don't reveal whether an account exists — treat "no such user" exactly
      // like success (Firebase itself usually does when enumeration protection
      // is on, but older projects can still surface it).
      if (e?.code === "auth/user-not-found") {
        markSent();
      } else {
        setAuthError(authErrorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToLogin = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/login");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <LoginBackground />
        <AppHeader showBack onBack={goBackToLogin} />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, { paddingBottom: insets.bottom }]}>
            <View style={styles.topContent}>
              <AppLogo />
            </View>
            <View style={styles.midContent}>
              {sent ? (
                <AuthCard
                  title="Check your email"
                  description="We just sent you a reset link"
                >
                  <View style={styles.sentBody}>
                    <View style={styles.sentIcon}>
                      <Feather name="mail" size={28} color={colors.base.accent} />
                    </View>
                    <Text style={styles.sentText} allowFontScaling={false}>
                      If an account exists for {email.trim()}, we’ve sent a
                      password reset link. Open it, choose a new password, then
                      come back and log in.
                    </Text>
                  </View>
                </AuthCard>
              ) : (
                <AuthCard
                  title="Forgot Password?"
                  description="Enter your email and we’ll send you a reset link"
                >
                  <View style={styles.inputGroup}>
                    <FormField error={fieldError} lastField>
                      <TextField
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          setFieldError(null);
                          setAuthError(null);
                        }}
                        placeholder="Email"
                        type="auth"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        error={!!fieldError}
                      />
                    </FormField>
                  </View>
                </AuthCard>
              )}
            </View>
            <View style={styles.footerContent}>
              {authError ? (
                <View style={styles.errorPill}>
                  <ErrorMessage message={authError} />
                </View>
              ) : null}
              {sent ? (
                <>
                  <AppButton text="Back to Log In" onPress={goBackToLogin} />
                  <Text style={styles.caption} allowFontScaling={false}>
                    Didn’t get the email?
                  </Text>
                  <AppButton
                    type="bare"
                    underline
                    text="Resend link"
                    loading={submitting}
                    loadingLabel="Sending"
                    onPress={handleSend}
                  />
                </>
              ) : (
                <AppButton
                  text="Send Reset Link"
                  loading={submitting}
                  loadingLabel="Sending"
                  onPress={handleSend}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: colors.base.white,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  topContent: {
    height: 100,
    display: "flex",
    alignItems: "center",
    width: "100%",
    justifyContent: "flex-end",
  },
  midContent: {
    width: "100%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerContent: {
    height: 160,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  inputGroup: {
    width: "100%",
  },
  sentBody: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  sentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(38, 86, 251, 0.12)",
  },
  sentText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    // Inside the white AuthCard — use its dark text, not the app-wide (light) primary.
    color: colors.base.gray800,
  },
  caption: {
    width: "80%",
    fontSize: 10,
    color: colors.semantic.text.primary,
    textAlign: "center",
  },
  errorPill: {
    backgroundColor: colors.base.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
});
