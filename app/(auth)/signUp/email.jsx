import { useState } from "react";
import { useSignup } from "@/context/SignupContext";
import { router } from "expo-router";
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TextField from "@/components/ui/input/textField";
import AppButton from "@/components/ui/appButton";
import { colors } from '@/constants/colors';
import FormField from "@/components/ui/form/formField";
import AuthCard from "@/components/ui/authInputCard";
import { LoginBackground } from "@/components/ui/loginBackground";
import AppHeader from "@/components/ui/appHeader";
import AppLogo from "@/components/ui/appMainLogo";
import { isEmailInUse } from "@/lib/auth";
import DismissKeyboard from '@/components/ui/layout/dismissKeyboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import StickyFooter, { stickyFooterOffset, useStickyFooterPadding } from '@/components/ui/layout/stickyFooter';

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const { signup, setEmail } = useSignup();
  const footerPadding = useStickyFooterPadding(1);
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
      const { inUse, pending } = await isEmailInUse(signup.email.trim());
      if (pending) {
        setError(
          "This email is waiting for verification. Check your inbox, or try again in a few minutes."
        );
        return;
      }
      if (inUse) {
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
    <View style={styles.container}>
        {/* Background shapes */}
        <LoginBackground />
        <AppHeader showBack />
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
            <View style={styles.footerContent} />
          </View>
          </DismissKeyboard>
        </KeyboardAwareScrollView>
        <StickyFooter style={styles.stickyFooter}>
          <AppButton
            text="Continue"
            loading={checking}
            loadingLabel="Checking email"
            state={signup.email?.trim() ? 'normal' : 'disabled'}
            onPress={handleContinue}
          />
          <Text style={styles.footerCaption}>
            Already have an account?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/(auth)/login")}
              accessibilityRole="button"
            >
              Log In
            </Text>
          </Text>
        </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  // Brand-blue bar: the white primary button reads on it (white-on-white otherwise)
  // and it hides content scrolling underneath, like the black footer elsewhere.
  footerCaption: {
    fontSize: 12,
    color: colors.base.white,
    textAlign: 'center',
  },
  footerLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
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
      flexGrow: 1, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: '100%', 
    }, 
    footerContent: {
      justifyContent: 'flex-end',
      alignItems: 'center',
      width: '100%',
    }
  });
