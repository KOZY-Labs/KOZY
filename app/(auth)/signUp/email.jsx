import { useState } from "react";
import { useSignup } from "@/context/SignupContext";
import { router } from "expo-router";
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import TextField from "@/components/ui/input/textField";
import AppButton from "@/components/ui/appButton";
import AppText from "@/components/ui/appText";
import { colors } from '@/constants/colors';
import FormField from "@/components/ui/form/formField";
import AuthCard from "@/components/ui/authInputCard";
import { LoginBackground } from "@/components/ui/loginBackground";
import AppHeader from "@/components/ui/appHeader";
import AppLogo from "@/components/ui/appMainLogo";
import { isEmailInUse } from "@/lib/auth";

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const { signup, setEmail } = useSignup();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const validate = () => {
    if (!signup.email) {
      setError("Email is required.");
      return false;
    }

    if (!signup.email.includes("@")) {
      setError("Enter a valid email address.");
      return false;
    }

    setError(null);
    return true;
  };

  // Surface "account already exists" here instead of at the end of the flow.
  const handleContinue = async () => {
    if (!validate()) return;
    setChecking(true);
    try {
      if (await isEmailInUse(signup.email.trim())) {
        setError("An account with this email already exists. Log in instead.");
        return;
      }
    } catch (e) {
      if (e?.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
        return;
      }
      // Network or other transient error — don't block signup; the final
      // create-account step still rejects duplicate emails.
    } finally {
      setChecking(false);
    }
    router.push("/(auth)/signUp/password");
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
          extraScrollHeight={-90}
        >
          <View style={[styles.content, { paddingBottom: insets.bottom }]}> 
            <View style={styles.topContent}>
              <AppLogo />
            </View>
            <View style={styles.midContent}>
              <AuthCard
                title="Sign Up Now"
                description="Enter your school or work email to get started."
              >
                <FormField error={error} lastField>
                  <TextField
                    error={error}
                    value={signup.email}
                    placeholder="Enter your email"
                    type="auth"
                    keyboardType="email-address"
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                  />
                </FormField>
              </AuthCard>
            </View>
            <View style={styles.footerContent}>
              <AppButton
                text="Continue"
                loading={checking}
                loadingLabel="Checking email"
                onPress={handleContinue}
              />
              <AppText variant="body-sm" color="primary" style={{ textAlign: "center", marginBottom: 8, marginTop: 20 }}>
                Already have an account?
              </AppText>
              <AppButton
                text="Log In"
                onPress={() => router.push("/(auth)/login")}
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
      flexGrow: 1, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: '100%', 
    }, 
    footerContent: {
      height: 160,
      justifyContent: 'flex-end',
      alignItems: 'center',
      width: '100%',
    }
  });
