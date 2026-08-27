import { useSignup } from "@/context/SignupContext";
import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { formatDob, isValidDob, meetsMinimumAge, MIN_AGE } from "@/lib/dob.mjs";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signup, setProfile } = useSignup();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);

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

    if (!signup.profile.firstName?.trim()) {
      nextErrors.firstName = "First name is required.";
    } else if (signup.profile.firstName.trim().length < 2) {
      nextErrors.firstName = "First name must be at least 2 characters.";
    }

    if (!signup.profile.lastName?.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!signup.profile.dob) {
      nextErrors.dob = "Date of birth is required.";
    } else if (!isValidDob(signup.profile.dob)) {
      nextErrors.dob = "Enter a valid date as MM/DD/YYYY.";
    } else if (!meetsMinimumAge(signup.profile.dob)) {
      nextErrors.dob = `You must be at least ${MIN_AGE} years old to use KOZY.`;
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