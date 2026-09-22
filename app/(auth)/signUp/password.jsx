import { useState } from "react";
import { useSignup } from "@/context/SignupContext";
import { router } from "expo-router";
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TextField from "@/components/ui/input/textField";
import AppButton from "@/components/ui/appButton";
import { colors } from '@/constants/colors';
import FormField from "@/components/ui/form/formField";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { LoginBackground } from "@/components/ui/loginBackground";
import AppHeader from "@/components/ui/appHeader"; 
import AppLogo from "@/components/ui/appMainLogo";
import AuthCard from "@/components/ui/authInputCard";
import { openPrivacyPolicy, openTerms } from "@/lib/links";
import DismissKeyboard from '@/components/ui/layout/dismissKeyboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import StickyFooter, { stickyFooterOffset, useStickyFooterPadding } from '@/components/ui/layout/stickyFooter';

export default function Password() {
  const insets = useSafeAreaInsets();
  const { signup, setPassword } = useSignup();

  const footerPadding = useStickyFooterPadding(1);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    password: null,
    confirmPassword: null,
  });

  const validate = () => {
    const nextErrors = {
      password: null,
      confirmPassword: null,
    };

    if (!signup.password) {
      nextErrors.password = "Password is required.";
    } else if (signup.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (signup.password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    return !nextErrors.password && !nextErrors.confirmPassword;
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
                title="Set password"
              >
                <View style={styles.inputGroup}>
                  <FormField error={errors.password}>
                    <TextField
                      value={signup.password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setErrors((e) => ({ ...e, password: null }));
                      }}
                      placeholder="Password"
                      type="auth"
                      secureTextEntry={!showPassword}
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
                  <FormField error={errors.confirmPassword} lastField>
                    <TextField
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setErrors((e) => ({ ...e, confirmPassword: null }));
                      }}
                      placeholder="Confirm Password"
                      type="auth"
                      secureTextEntry={!showConfirmPassword}
                      rightIcon={
                        <MaterialIcons
                          name={showConfirmPassword ? "visibility-off" : "visibility"}
                          size={20}
                          color={colors.semantic.text.secondary}
                        />
                      }
                      onRightIconPress={() => setShowConfirmPassword((value) => !value)}
                      rightIconAccessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                      error={!!errors.confirmPassword}
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
          <AppButton
            text="Continue"
            state={signup.password && confirmPassword ? 'normal' : 'disabled'}
            onPress={() => {
              if (!validate()) return;
              router.push("/(auth)/signUp/profile");
            }}
          />
          <Text style={styles.footerCaption}>
            By continuing you agree to our{" "}
            <Text style={styles.footerLink} onPress={openTerms}>Terms of Service</Text>
            {" "}and{" "}
            <Text style={styles.footerLink} onPress={openPrivacyPolicy}>Privacy Policy</Text>.
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
      flexGrow: 1, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: '100%', 
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
    paddingHorizontal: 16,
  },
  footerLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  inputGroup: {
    width: '100%',
  },
});