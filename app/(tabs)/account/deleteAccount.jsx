import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, StyleSheet, View, KeyboardAvoidingView } from 'react-native';

import AppButton from '@/components/ui/appButton';
import AppText from '@/components/ui/appText';
import TextField from '@/components/ui/input/textField';
import FormField from '@/components/ui/form/formField';
import DisplayField from '@/components/ui/displayField';
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/constants/colors';
import { deleteAccount } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth/errors';

export default function DeleteAccount() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = () => {
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    showConfirmModal({
      title: 'Delete Account',
      message: 'This permanently deletes your account, listings, and chats. This cannot be undone.',
      primaryText: 'Delete',
      secondaryText: 'Cancel',
      onPrimary: async () => {
        setSubmitting(true);
        setError(null);
        try {
          await deleteAccount(password);
          showAlertModal({ title: 'Account deleted', message: 'Your account and data have been removed.' });
          // Clear this tab's stack first so the account tab can't resurface
          // the Delete Account screen, then land on the home feed.
          router.dismissAll();
          router.replace('/(tabs)/home');
        } catch (e) {
          setError(authErrorMessage(e));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <DisplayField title="We're sad to see you go" style={{ marginBottom: 16 }}>
          Deleting your account permanently removes your profile, listings, chats, and
          saved places. This cannot be undone.
        </DisplayField>
        <View style={styles.formField}>
          <View style={{ paddingHorizontal: 36 }}>
            <AppText variant="body-sm" color="primary" style={styles.confirmLabel}>
              Enter your password to confirm.
            </AppText>
            <FormField error={error}>
              <TextField
                value={password}
                placeholder="Password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                rightIcon={
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={colors.semantic.input.textDisabled}
                  />
                }
                onRightIconPress={() => setShowPassword((value) => !value)}
                rightIconAccessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                error={!!error}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
              />
            </FormField>
          </View>
          <View style={styles.buttonContainer}>
            <AppButton
              text="Delete Account"
              size="lg"
              type="primary"
              loading={submitting}
              loadingLabel="Deleting account"
              onPress={handleDelete}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    gap: 50,
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 16,
  },
  confirmLabel: {
    marginBottom: 12,
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
