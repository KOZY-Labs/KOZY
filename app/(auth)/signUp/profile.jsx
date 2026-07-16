import { useSignup } from "@/context/SignupContext";
import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import TextField from "@/components/ui/input/textField";
import AppButton from "@/components/ui/appButton";
import FormField from "@/components/ui/form/formField";
import ErrorMessage from "@/components/ui/form/errorMessage";
import { LoginBackground } from "@/components/ui/loginBackground";
import AppHeader from "@/components/ui/appHeader";
import AuthCard from "@/components/ui/authInputCard";
import AppLogo from "@/components/ui/appMainLogo";
import { signUpWithEmail } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth/errors";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signup, setProfile } = useSignup();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);
  const formatDob = (text) => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };
  
  const [errors, setErrors] = useState({
    firstName: null,
    lastName: null,
    dob: null,
  });

  const validate = () => {
    const nextErrors = {
      firstName: null,
      lastName: null,
      dob: null,
    };

    if (!signup.profile.firstName) {
      nextErrors.firstName = "First name is required.";
    }

    if (!signup.profile.lastName) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!signup.profile.dob) {
      nextErrors.dob = "Date of birth is required.";
    }

    setErrors(nextErrors);
    return !nextErrors.firstName && !nextErrors.lastName && !nextErrors.dob;
  };

  // Account is created here (end of the flow), which also sends the email verification link.
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setAuthError(null);
    try {
      await signUpWithEmail({
        email: signup.email.trim(),
        password: signup.password,
        profile: signup.profile,
      });
      router.replace("/(auth)/signUp/verify");
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
        <AppHeader showBack />
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={-50}
        >
          <View style={[styles.content, { paddingBottom: insets.bottom }]}> 
            <View style={styles.topContent}>
              <AppLogo />
            </View>
            <View style={styles.midContent}>
              <AuthCard
                title="Tell Us About Yourself"
                description="Make your experience more personal and trustworthy"
              >
                <View style={styles.inputGroup}>
                  <FormField error={errors.firstName}>
                    <TextField
                      value={signup.profile.firstName}
                      onChangeText={(text) => {
                        setProfile({ firstName: text });
                        setErrors((e) => ({ ...e, firstName: null }));
                      }}
                      placeholder="First Name"
                      type="auth"
                      error={!!errors.firstName}
                    />
                  </FormField>

                  <FormField error={errors.lastName}>
                    <TextField
                      value={signup.profile.lastName}
                      onChangeText={(text) => {
                        setProfile({ lastName: text });
                        setErrors((e) => ({ ...e, lastName: null }));
                      }}
                      placeholder="Last Name"
                      type="auth"
                      error={!!errors.lastName}
                    />
                  </FormField>

                  <FormField error={errors.dob} lastField>
                    <TextField
                      value={signup.profile.dob}
                      onChangeText={(text) => {
                        setProfile({ dob: formatDob(text) });
                        setErrors((e) => ({ ...e, dob: null }));
                      }}
                      keyboardType="number-pad"
                      maxLength={10}
                      placeholder="Date of Birth (MM/DD/YYYY)"
                      type="auth"
                      error={!!errors.dob}
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
                text="Continue"
                loading={submitting}
                loadingLabel="Creating account"
                onPress={handleSubmit}
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
  footerContent: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  inputGroup: {
    width: '100%',
  },
  errorPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
});