import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TextField from "@/components/ui/input/textField";
import AppButton from "@/components/ui/appButton";
import FormField from "@/components/ui/form/formField";
import ErrorMessage from "@/components/ui/form/errorMessage";
import { colors } from "@/constants/colors";
import { LoginBackground } from "@/components/ui/loginBackground";
import AuthCard from "@/components/ui/authInputCard";
import AppLogo from "@/components/ui/appMainLogo";
import AppHeader from "@/components/ui/appHeader";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { loginWithEmail } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth/errors";
import DismissKeyboard from '@/components/ui/layout/dismissKeyboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import StickyFooter, { stickyFooterOffset, useStickyFooterPadding } from '@/components/ui/layout/stickyFooter';

export default function Login() {
  const insets = useSafeAreaInsets();
  const { redirect } = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);

  const footerPadding = useStickyFooterPadding(1);
  const [errors, setErrors] = useState({
    email: null,
    password: null,
  });

  // A stale auth error shouldn't follow the user back to this screen.
  useFocusEffect(
    useCallback(() => {
      return () => setAuthError(null);
    }, [])
  );

  const validate = () => {
    const nextErrors = {
      email: null,
      password: null,
    };

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!email.includes("@")) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  const handleLogin = async () => {
    // Clear before validating so field errors and the auth pill never show together.
    setAuthError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      router.replace(redirect ?? "/(tabs)/home");
    } catch (e) {
      setAuthError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
        {/* Background shapes */}
        <LoginBackground />
        <AppHeader
          showBack
          onBack={() => {
            // Gates push this screen; pop back to where the user was.
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home');
            }
          }}
        />
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: footerPadding }}
          keyboardShouldPersistTaps="handled"
          bottomOffset={stickyFooterOffset(1) + 24}
        >
          <DismissKeyboard>
          <View style={[styles.content, { paddingBottom: insets.bottom }]}>
            <View style={styles.topContent}>
              <AppLogo />
            </View>
            <View style={styles.midContent}>
              <AuthCard
                title="Log In to Continue"
                description="Match with the Right Room, Right Roommate"
              >    
                <View style={styles.inputGroup}>
                  <FormField error={errors.email}>
                    <TextField
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setErrors((e) => ({ ...e, email: null }));
                        setAuthError(null);
                      }}
                      placeholder="Email"
                      type="auth"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      error={!!errors.email}
                    />
                  </FormField>

                  <FormField error={errors.password} lastField>
                    <TextField
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setErrors((e) => ({ ...e, password: null }));
                        setAuthError(null);
                      }}
                      placeholder="Password"
                      type="auth"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      rightIcon={
                        <MaterialIcons
                          name={showPassword ? "visibility-off" : "visibility"}
                          size={20}
                          color={colors.semantic.text.secondary}
                        />
                      }
                      onRightIconPress={() => setShowPassword((value) => !value)}
                      rightIconAccessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      error={!!errors.password}
                    />
                  </FormField>
                  <View style={styles.forgotRow}>
                    <Text
                      style={styles.forgotLink}
                      onPress={() => router.push("/(auth)/forgot-password")}
                      accessibilityRole="button"
                    >
                      Forgot password?
                    </Text>
                  </View>
                </View>
              </AuthCard>
            </View>
            <View style={styles.footerContent} />
          </View>
          </DismissKeyboard>
        </KeyboardAwareScrollView>
        {/* Primary CTA rides above the keyboard (rule 21); links stay in the scroll. */}
        <StickyFooter style={styles.stickyFooter}>
          {authError ? (
            <View style={styles.errorPill}>
              <ErrorMessage message={authError} />
            </View>
          ) : null}
          <AppButton
            text="Log In"
            loading={submitting}
            loadingLabel="Logging in"
            state={email.trim() && password ? 'normal' : 'disabled'}
            onPress={handleLogin}
          />
          {/* Account switch lives with the CTA on the blue bar — always the same
              background, so one text color reads everywhere. */}
          <Text style={styles.footerCaption}>
            Don’t have an account?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/(auth)/signUp/email")}
              accessibilityRole="button"
            >
              Sign up
            </Text>
          </Text>
        </StickyFooter>
    </View>
  );
}


const styles = StyleSheet.create({
  // Brand-blue bar: the white primary button reads on it (white-on-white otherwise)
  // and it hides content scrolling underneath, like the black footer elsewhere.
  stickyFooter: {
    backgroundColor: colors.base.accent,
  },
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
    display: 'flex', 
    alignItems: 'center', 
    width: '100%', 
    justifyContent: 'flex-end',
  }, 
  midContent: { 
    width: '100%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',   
  },
  footerContent: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  footerCaption: {
    fontSize: 12,
    color: colors.base.white,
    textAlign: "center",
  },
  footerLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  inputGroup: {
    width: '100%',
  },
  forgotRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  forgotLink: {
    fontSize: 12,
    color: colors.base.gray800,
    textDecorationLine: 'underline',
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