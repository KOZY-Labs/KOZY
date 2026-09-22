// Account & Security — the private side of the account (sign-in email, password,
// deletion), split from Edit Profile which is only what other members see. Every
// action is a drawer on this one screen; the tab bar is hidden here
// ((tabs)/_layout.jsx) so drawer CTAs always sit on the real bottom edge.
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';

import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import AppDrawer from '@/components/ui/drawer/AppDrawer';
import FormField from '@/components/ui/form/formField';
import InputRow from '@/components/ui/layout/inputRow';
import TextField from '@/components/ui/input/textField';
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { requestEmailChange, changePassword, deleteAccount } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth/errors';

const MIN_PASSWORD_LENGTH = 8; // same rule as signUp/password.jsx

export default function AccountSecurity() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  // --- email change ---
  const emailEditDrawerRef = useRef(null);
  const emailCheckDrawerRef = useRef(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [changingEmail, setChangingEmail] = useState(false);

  // --- password change ---
  const passwordDrawerRef = useRef(null);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  // --- delete account ---
  const deleteDrawerRef = useRef(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // One visibility toggle per secure field.
  const [show, setShow] = useState({});
  const eyeIconProps = (key) => ({
    secureTextEntry: !show[key],
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

  const handleEmailChange = async () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (!emailPassword) {
      setEmailError('Enter your current password.');
      return;
    }
    setChangingEmail(true);
    setEmailError(null);
    try {
      await requestEmailChange(email, emailPassword);
      emailEditDrawerRef.current?.close();
      emailCheckDrawerRef.current?.snapToIndex(0);
      setNewEmail('');
      setEmailPassword('');
    } catch (e) {
      setEmailError(authErrorMessage(e));
    } finally {
      setChangingEmail(false);
    }
  };

  const handlePasswordChange = async () => {
    const errors = {};
    if (!pw.current) errors.current = 'Enter your current password.';
    if (!pw.next) {
      errors.next = 'Enter a new password.';
    } else if (pw.next.length < MIN_PASSWORD_LENGTH) {
      errors.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    } else if (pw.current && pw.next === pw.current) {
      errors.next = 'New password must be different from your current one.';
    }
    if (!pw.confirm) {
      errors.confirm = 'Please confirm your new password.';
    } else if (pw.confirm !== pw.next) {
      errors.confirm = 'Passwords do not match.';
    }
    setPwErrors(errors);
    if (Object.keys(errors).length) return;

    setChangingPassword(true);
    try {
      await changePassword(pw.current, pw.next);
      passwordDrawerRef.current?.close();
      setPw({ current: '', next: '', confirm: '' });
      showAlertModal({
        title: 'Password updated',
        message: 'Use your new password the next time you log in.',
      });
    } catch (e) {
      if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
        setPwErrors({ current: 'Current password is incorrect.' });
      } else {
        showAlertModal({ title: "Couldn't update password", message: authErrorMessage(e) });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDelete = () => {
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    showConfirmModal({
      title: 'Delete Account',
      message: 'This permanently deletes your account, listings, and chats. This cannot be undone.',
      primaryText: 'Delete',
      secondaryText: 'Cancel',
      onPrimary: async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
          await deleteAccount(deletePassword);
          deleteDrawerRef.current?.close();
          showAlertModal({ title: 'Account deleted', message: 'Your account and data have been removed.' });
          // Clear this tab's stack first so the account tab can't resurface this
          // screen, then land on the home feed.
          router.dismissAll();
          router.replace('/(tabs)/home');
        } catch (e) {
          setDeleteError(authErrorMessage(e));
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const pwField = (key, placeholder, last = false) => (
    <FormField error={pwErrors[key]} lastField={last}>
      <InputRow>
        <TextField
          value={pw[key]}
          placeholder={placeholder}
          autoCapitalize="none"
          error={!!pwErrors[key]}
          onChangeText={(text) => {
            setPw((p) => ({ ...p, [key]: text }));
            setPwErrors((e) => ({ ...e, [key]: null }));
          }}
          {...eyeIconProps(key)}
        />
      </InputRow>
    </FormField>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.group}>
          <View style={[styles.row, styles.emailRow]}>
            <View style={styles.rowLabel}>
              <Feather name="mail" size={20} color="#fff" />
              <View style={{ flexShrink: 1 }}>
                <AppText variant="body-md" color="primary">Email</AppText>
                <AppText variant="body-xsm" style={styles.emailValue} numberOfLines={1}>
                  {user?.email || profile?.email || '—'}
                </AppText>
              </View>
            </View>
            <View style={{ width: 92 }}>
              <AppButton
                text="Edit"
                size="sm"
                type="primary"
                onPress={() => emailEditDrawerRef.current?.snapToIndex(0)}
              />
            </View>
          </View>
          <Pressable onPress={() => passwordDrawerRef.current?.snapToIndex(0)}>
            <View style={styles.row}>
              <Feather name="key" size={20} color="#fff" />
              <AppText variant="body-md" color="primary" style={styles.rowText}>Change Password</AppText>
            </View>
          </Pressable>
        </View>

        {/* Destructive action lives at the bottom of the security screen — one level
            deeper than My Page, still two taps from it (store-policy reachable). */}
        <View style={styles.group}>
          <Pressable onPress={() => deleteDrawerRef.current?.snapToIndex(0)}>
            <View style={styles.row}>
              <Feather name="trash-2" size={20} color={colors.semantic.text.error} />
              <AppText variant="body-md" style={[styles.rowText, { color: colors.semantic.text.error }]}>
                Delete Account
              </AppText>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <AppDrawer
        ref={emailEditDrawerRef}
        title="Update email address"
        align="center"
        description="Enter your new email and current password"
        primaryActionText={changingEmail ? 'Sending...' : 'Send Verification Link'}
        primaryAction={handleEmailChange}
        primaryDisabled={changingEmail || !newEmail.trim() || !emailPassword}
      >
        <View>
          <AppText variant="body-xsm">✶ We’ll send a verification link to your new email.</AppText>
          <AppText variant="body-xsm">✶ Your login email changes only after you open that link.</AppText>
        </View>
        <View style={{ marginTop: 32 }}>
          <FormField label="" error={emailError}>
            <InputRow>
              <TextField
                placeholder="New email address"
                autoCapitalize="none"
                keyboardType="email-address"
                error={!!emailError}
                value={newEmail}
                onChangeText={(text) => {
                  setNewEmail(text);
                  setEmailError(null);
                }}
              />
            </InputRow>
          </FormField>
          <FormField label="" lastField>
            <InputRow>
              <TextField
                placeholder="Current password"
                autoCapitalize="none"
                error={!!emailError}
                value={emailPassword}
                onChangeText={(text) => {
                  setEmailPassword(text);
                  setEmailError(null);
                }}
                {...eyeIconProps('email')}
              />
            </InputRow>
          </FormField>
        </View>
      </AppDrawer>

      <AppDrawer
        ref={emailCheckDrawerRef}
        title="Check your inbox"
        align="center"
        description="We’ve sent a verification link to your new email. Open it to finish the change, then log in again with your new email."
        primaryActionText="Done"
        primaryAction={() => emailCheckDrawerRef.current?.close()}
      />

      <AppDrawer
        ref={passwordDrawerRef}
        title="Change password"
        align="center"
        description="Enter your current password, then choose a new one. You’ll stay logged in on this device."
        primaryActionText={changingPassword ? 'Updating...' : 'Update Password'}
        primaryAction={handlePasswordChange}
        primaryDisabled={changingPassword || !pw.current || !pw.next || !pw.confirm}
      >
        {pwField('current', 'Current password')}
        {pwField('next', 'New password')}
        {pwField('confirm', 'Confirm new password', true)}
      </AppDrawer>

      <AppDrawer
        ref={deleteDrawerRef}
        title="We're sad to see you go"
        align="center"
        description="Deleting your account permanently removes your profile, listings, chats, and saved places. This cannot be undone."
        primaryActionText={deleting ? 'Deleting...' : 'Delete Account'}
        primaryType="danger"
        primaryAction={handleDelete}
        primaryDisabled={deleting || !deletePassword}
      >
        <FormField label="" error={deleteError} lastField>
          <InputRow>
            <TextField
              value={deletePassword}
              placeholder="Enter your password to confirm"
              autoCapitalize="none"
              error={!!deleteError}
              onChangeText={(text) => {
                setDeletePassword(text);
                setDeleteError(null);
              }}
              {...eyeIconProps('delete')}
            />
          </InputRow>
        </FormField>
      </AppDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: 'black',
  },
  group: {
    marginBottom: 24,
    backgroundColor: '#535353',
    paddingVertical: 12,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  // Android mis-measures some self-sized row labels (see account/index.jsx).
  rowText: {
    flex: 1,
  },
  emailRow: {
    justifyContent: 'space-between',
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  emailValue: {
    color: colors.semantic.text.disabled,
  },
});
