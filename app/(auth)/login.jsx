import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
import { loginWithEmail } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth/errors";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { redirect } = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [errors, setErrors] = useState({
    email: null,
    password: null,
  });

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
    if (!validate()) return;
    setSubmitting(true);
    setAuthError(null);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
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
                      }}
                      placeholder="Password"
                      type="auth"
                      secureTextEntry
                      autoCapitalize="none"
                      error={!!errors.password}
                    />
                  </FormField>
                </View>
              </AuthCard>
            </View>
            <View style={styles.footerContent}>
              {authError ? (
                <View style={styles.errorPill}>
                  <ErrorMessage message={authError} />
                </View>
              ) : null}
              <AppButton
                text="Log In"
                loading={submitting}
                loadingLabel="Logging in"
                onPress={handleLogin}
              />

              <Text style={styles.caption}>
                Don’t have an account?{" "}
              </Text>
              <AppButton
                type="bare"
                underline
                text="Click here to sign up!"
                onPress={() => router.push("/(auth)/signUp/email")}
              />
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
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  caption: {
    width: '80%',
    fontSize: 10,
    color: colors.semantic.text.primary,
    textAlign: "center",
  },
  link: {
    color: colors.semantic.text.primary,
    textDecorationLine: "underline",
    textAlign: "center",
  },
  inputGroup: {
    width: '100%',
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