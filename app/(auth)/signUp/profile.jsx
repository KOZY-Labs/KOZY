import { useSignup } from "@/context/SignupContext";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, View, Text } from 'react-native';
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
import { DISPLAY_NAME_MIN_LEN, DISPLAY_NAME_MAX_LEN, LEGAL_NAME_MAX_LEN } from "@/constants/data";
import { colors } from "@/constants/colors";
import DismissKeyboard from '@/components/ui/layout/dismissKeyboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import StickyFooter, { stickyFooterOffset, useStickyFooterPadding } from '@/components/ui/layout/stickyFooter';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signup, setProfile } = useSignup();
  const footerPadding = useStickyFooterPadding(1);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [errors, setErrors] = useState({
    displayName: null,
    firstName: null,
    lastName: null,
    dob: null,
  });

  // A stale auth error shouldn't follow the user back to this screen.
  useFocusEffect(
    useCallback(() => {
      return () => setAuthError(null);
    }, [])
  );

  const validate = () => {
    const nextErrors = {
      displayName: null,
      firstName: null,
      lastName: null,
      dob: null,
    };

    const displayName = signup.profile.displayName?.trim() ?? "";
    if (!displayName) {
      nextErrors.displayName = "Display name is required.";
    } else if (displayName.length < DISPLAY_NAME_MIN_LEN || displayName.length > DISPLAY_NAME_MAX_LEN) {
      nextErrors.displayName = `Display name must be ${DISPLAY_NAME_MIN_LEN}–${DISPLAY_NAME_MAX_LEN} characters.`;
    }

    if (!signup.profile.firstName?.trim()) {
      nextErrors.firstName = "Legal first name is required.";
    } else if (signup.profile.firstName.trim().length < 2) {
      nextErrors.firstName = "First name must be at least 2 characters.";
    }

    if (!signup.profile.lastName?.trim()) {
      nextErrors.lastName = "Legal last name is required.";
    }

    if (!signup.profile.dob) {
      nextErrors.dob = "Date of birth is required.";
    } else if (!isValidDob(signup.profile.dob)) {
      nextErrors.dob = "Enter a valid date as MM/DD/YYYY.";
    } else if (!meetsMinimumAge(signup.profile.dob)) {
      nextErrors.dob = `You must be at least ${MIN_AGE} years old to use KOZY.`;
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every((e) => !e);
  };

  // Account is created here (end of the flow), which also sends the email verification link.
  const handleSubmit = async () => {
    // Clear before validating so field errors and the auth pill never show together.
    setAuthError(null);
    if (!validate()) return;
    setSubmitting(true);
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
                title="Tell Us About Yourself"
                description="Your display name is public. Your legal name and date of birth are used only for identity verification."
              >
                <View style={styles.inputGroup}>
                  <FormField error={errors.displayName}>
                    <TextField
                      value={signup.profile.displayName}
                      onChangeText={(text) => {
                        setProfile({ displayName: text });
                        setErrors((e) => ({ ...e, displayName: null }));
                        setAuthError(null);
                      }}
                      placeholder="Display Name"
                      type="auth"
                      maxLength={DISPLAY_NAME_MAX_LEN}
                      suffixText={`${(signup.profile.displayName ?? '').length}/${DISPLAY_NAME_MAX_LEN}`}
                      error={!!errors.displayName}
                    />
                    <Text style={styles.helper} allowFontScaling={false}>
                      This is the name other KOZY members will see.
                    </Text>
                  </FormField>

                  <FormField error={errors.firstName}>
                    <TextField
                      value={signup.profile.firstName}
                      onChangeText={(text) => {
                        setProfile({ firstName: text });
                        setErrors((e) => ({ ...e, firstName: null }));
                        setAuthError(null);
                      }}
                      placeholder="Legal First Name"
                      type="auth"
                      maxLength={LEGAL_NAME_MAX_LEN}
                      suffixText={`${(signup.profile.firstName ?? '').length}/${LEGAL_NAME_MAX_LEN}`}
                      error={!!errors.firstName}
                    />
                  </FormField>

                  <FormField error={errors.lastName}>
                    <TextField
                      value={signup.profile.lastName}
                      onChangeText={(text) => {
                        setProfile({ lastName: text });
                        setErrors((e) => ({ ...e, lastName: null }));
                        setAuthError(null);
                      }}
                      placeholder="Legal Last Name"
                      type="auth"
                      maxLength={LEGAL_NAME_MAX_LEN}
                      suffixText={`${(signup.profile.lastName ?? '').length}/${LEGAL_NAME_MAX_LEN}`}
                      error={!!errors.lastName}
                    />
                  </FormField>

                  <FormField error={errors.dob} lastField>
                    <TextField
                      value={signup.profile.dob}
                      onChangeText={(text) => {
                        setProfile({ dob: formatDob(text) });
                        setErrors((e) => ({ ...e, dob: null }));
                        setAuthError(null);
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
            <View style={styles.footerContent} />
          </View>
          </DismissKeyboard>
        </KeyboardAwareScrollView>
        <StickyFooter style={styles.stickyFooter}>
          {authError ? (
            <View style={styles.errorPill}>
              <ErrorMessage message={authError} />
            </View>
          ) : null}
          <AppButton
            text="Continue"
            loading={submitting}
            loadingLabel="Creating account"
            state={
              signup.profile.displayName?.trim() &&
              signup.profile.firstName?.trim() &&
              signup.profile.lastName?.trim() &&
              signup.profile.dob?.trim()
                ? 'normal'
                : 'disabled'
            }
            onPress={handleSubmit}
          />
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
  helper: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    // Inside the white AuthCard — dark helper text.
    color: colors.base.gray700,
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