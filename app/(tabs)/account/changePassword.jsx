import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, StyleSheet, View, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/ui/appButton';
import TextField from '@/components/ui/input/textField';
import FormField from '@/components/ui/form/formField';
import DisplayField from '@/components/ui/displayField';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/constants/colors';
import { changePassword } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth/errors';

const MIN_LENGTH = 8; // same rule as signUp/password.jsx

export default function ChangePassword() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({ current: null, next: null, confirm: null });
  const [submitting, setSubmitting] = useState(false);

  const clearError = (key) => setErrors((e) => ({ ...e, [key]: null }));

  const eyeIconProps = (key) => ({
    rightIcon: (
      <MaterialIcons
        name={show[key] ? 'visibility-off' : 'visibility'}
        size={20}
        color={colors.semantic.input.textDisabled}
      />
    ),
    onRightIconPress: () => setShow((s) => ({ ...s, [key]: !s[key] })),
    rightIconAccessibilityLabel: show[key] ? 'Hide password' : 'Show password',
  });

  const validate = () => {
    const nextErrors = { current: null, next: null, confirm: null };
    if (!current) nextErrors.current = 'Enter your current password.';
    if (!next) {
      nextErrors.next = 'Enter a new password.';
    } else if (next.length < MIN_LENGTH) {
      nextErrors.next = `Password must be at least ${MIN_LENGTH} characters.`;
    } else if (current && next === current) {
      nextErrors.next = 'New password must be different from your current one.';
    }
    if (!confirm) {
      nextErrors.confirm = 'Please confirm your new password.';
    } else if (confirm !== next) {
      nextErrors.confirm = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    return !nextErrors.current && !nextErrors.next && !nextErrors.confirm;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await changePassword(current, next);
      showAlertModal({
        title: 'Password updated',
        message: 'Use your new password the next time you log in.',
      });
      router.back();
    } catch (e) {
      if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
        // Wrong current password — surface it on the field the user has to fix.
        setErrors((prev) => ({ ...prev, current: 'Current password is incorrect.' }));
      } else {
        // Anything else (network, too-many-requests, …) isn't a field problem.
        showAlertModal({ title: "Couldn't update password", message: authErrorMessage(e) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        // Bottom clearance from insets — the floating tab bar overlays this screen.
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 92 }]}
        keyboardShouldPersistTaps="handled"
      >
        <DisplayField title="Change Password" style={{ marginBottom: 16 }}>
          Enter your current password, then choose a new one. You’ll stay logged in
          on this device.
        </DisplayField>
        <View style={styles.formField}>
          <View style={{ paddingHorizontal: 36, gap: 4 }}>
            <FormField error={errors.current}>
              <TextField
                value={current}
                placeholder="Current password"
                secureTextEntry={!show.current}
                autoCapitalize="none"
                {...eyeIconProps('current')}
                error={!!errors.current}
                onChangeText={(text) => {
                  setCurrent(text);
                  clearError('current');
                }}
              />
            </FormField>
            <FormField error={errors.next}>
              <TextField
                value={next}
                placeholder="New password"
                secureTextEntry={!show.next}
                autoCapitalize="none"
                {...eyeIconProps('next')}
                error={!!errors.next}
                onChangeText={(text) => {
                  setNext(text);
                  clearError('next');
                }}
              />
            </FormField>
            <FormField error={errors.confirm} lastField>
              <TextField
                value={confirm}
                placeholder="Confirm new password"
                secureTextEntry={!show.confirm}
                autoCapitalize="none"
                {...eyeIconProps('confirm')}
                error={!!errors.confirm}
                onChangeText={(text) => {
                  setConfirm(text);
                  clearError('confirm');
                }}
              />
            </FormField>
          </View>
          <View style={styles.buttonContainer}>
            <AppButton
              text="Update Password"
              size="lg"
              type="primary"
              loading={submitting}
              loadingLabel="Updating"
              onPress={handleSubmit}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexDirection: 'column',
    gap: 40,
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  formField: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 20,
    paddingBottom: 20,
  },
});
