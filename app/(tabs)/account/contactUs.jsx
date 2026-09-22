import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';

import AppButton from '@/components/ui/appButton';
import TextField from '@/components/ui/input/textField';
import FormField from '@/components/ui/form/formField';
import TextArea from '@/components/ui/input/textArea';
import DisplayField from '@/components/ui/displayField';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import { useAuth } from '@/context/AuthContext';
import { createReport } from '@/lib/db/reports';
import { showAuthGate } from '@/lib/authGate';
import StickyFooter, { stickyFooterOffset, useStickyFooterPadding } from '@/components/ui/layout/stickyFooter';
import DismissKeyboard from '@/components/ui/layout/dismissKeyboard';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// General contact form only. Listing/user reports go through the report drawer
// (components/ui/reportDrawerHost.jsx) — they no longer route here.
export default function ContactUs() {
    const footerPadding = useStickyFooterPadding();
    const { user, uid, profile } = useAuth();

    // Prefill from the profile once at mount — the live users-doc subscription keeps the
    // profile warm well before the user can navigate this deep, so no effect machinery.
    const [name, setName] = useState(profile?.displayName || profile?.name || '');
    const [email, setEmail] = useState(user?.email || profile?.email || '');
    const [errors, setErrors] = useState({});
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const submittedRef = useRef(false);
    const canSubmit = !!name.trim() && emailPattern.test(email.trim()) && !!body.trim();

    const validateForm = () => {
        const nextErrors = {};
        const trimmedEmail = email.trim();

        if (!name.trim()) {
            nextErrors.name = 'Name is required.';
        }

        if (!trimmedEmail) {
            nextErrors.email = 'Email is required.';
        } else if (!emailPattern.test(trimmedEmail)) {
            nextErrors.email = 'Enter a valid email address.';
        }

        if (!body.trim()) {
            nextErrors.body = 'Message is required.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (submittedRef.current) return; // one submission per visit — no duplicates
        if (!validateForm()) return;
        // firestore.rules requires reporterId == auth.uid; without a session the write
        // would fail with a raw permission error. Use the shared gate (Sign Up / Log In
        // with a redirect back here) — a dead-end alert would lose the typed message.
        if (!uid) {
            showAuthGate({
                title: 'Sign in required',
                message: 'Sign Up or Log In to send us a message.',
                redirect: '/(tabs)/account/contactUs',
            });
            return;
        }
        setSubmitting(true);
        try {
            await createReport({
                targetType: 'general',
                reporterId: uid,
                name: name.trim(),
                email: email.trim(),
                message: body.trim(),
            });
            // Clear before the modal so a hardware-back dismiss can't re-send the
            // same message; Close lands on My Page.
            setBody('');
            showAlertModal({
                title: 'Thank you for reaching out!',
                message:
                    'We\'ll review your message and respond within 1–2 business days.\n\nStill need help? Email us at info@getkozy.app',
                buttonText: 'Close',
                onPress: () => router.dismissTo('/(tabs)/account'),
            });
        } catch (e) {
            showAlertModal({ title: 'Message not sent', message: e?.message ?? 'Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

  return (
    <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
            // Bottom clearance from insets — the floating tab bar overlays this screen.
            contentContainerStyle={[styles.container, { paddingBottom: footerPadding }]}
            keyboardShouldPersistTaps="handled"
            bottomOffset={stickyFooterOffset(1) + 24}
        >
          <DismissKeyboard>
        <DisplayField
            title="Have a question, feedback, or need support?"
            style={{ marginBottom: 16 }}
        >
            {"We're here to help. Reach out and we'll get back to you as soon as possible."}
        </DisplayField>
        <View style={styles.formField}>
            <View style={{ paddingHorizontal:36 }}>
                <FormField error={errors.name}>
                    <TextField
                        value={name}
                        placeholder="Your Name"
                        error={!!errors.name}
                        onChangeText={(n) => {
                            setName(n);
                            setErrors((currentErrors) => ({ ...currentErrors, name: null }));
                        }}
                    />
                </FormField>
                <FormField error={errors.email}>
                    <TextField
                        value={email}
                        placeholder="Your Email"
                        error={!!errors.email}
                        onChangeText={(n) => {
                            setEmail(n);
                            setErrors((currentErrors) => ({ ...currentErrors, email: null }));
                        }}
                    />
                </FormField>
                <FormField error={errors.body}>
                    <TextArea
                        value={body}
                        maxLength={300}
                        placeholder="Tell us what you need help with."
                        error={!!errors.body}
                        onChangeText={(n) => {
                            setBody(n);
                            setErrors((currentErrors) => ({ ...currentErrors, body: null }));
                        }}

                    />
                </FormField>
            </View>
        </View>
          </DismissKeyboard>
        </KeyboardAwareScrollView>
        <StickyFooter>
            <AppButton
                text="Send Message"
                size="lg"
                type='primary'
                loading={submitting}
                state={canSubmit ? 'normal' : 'disabled'}
                onPress={handleSubmit}
            />
        </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flexGrow (not flex): a fixed-height scroll content can't scroll when the
    // keyboard shrinks the viewport, which buried the CTA under the keyboard.
    flexGrow: 1,
    flexDirection: 'column',
    gap: 50,
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  formField: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 20,
    paddingBottom: 20,
  }
});
