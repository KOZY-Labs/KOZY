import { useRef, useState } from 'react';
import { Platform, StyleSheet, View, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import AppButton from '@/components/ui/appButton';
import TextField from '@/components/ui/input/textField';
import FormField from '@/components/ui/form/formField';
import TextArea from '@/components/ui/input/textArea';
import DisplayField from '@/components/ui/displayField';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import { useAuth } from '@/context/AuthContext';
import { createReport } from '@/lib/db/reports';
import { showAuthGate } from '@/lib/authGate';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactUs() {
    const insets = useSafeAreaInsets();
    // Report flow (listing detail → Report) passes `listingId` so the submission is tied
    // to the listing, and `backTo` so submitting returns the user to where they came from.
    const params = useLocalSearchParams();
    const backTo = Array.isArray(params.backTo) ? params.backTo[0] : params.backTo;
    const listingId = Array.isArray(params.listingId) ? params.listingId[0] : params.listingId;
    const { user, uid, profile } = useAuth();
    const isReport = !!listingId;

    // Prefill from the profile once at mount — the live users-doc subscription keeps the
    // profile warm well before the user can navigate this deep, so no effect machinery.
    const [name, setName] = useState(profile?.name ?? '');
    const [email, setEmail] = useState(user?.email || profile?.email || '');
    const [errors, setErrors] = useState({});
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const submittedRef = useRef(false);

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
        if (submittedRef.current) return; // one submission per visit — no duplicate reports
        if (!validateForm()) return;
        // firestore.rules requires reporterId == auth.uid; without a session the write
        // would fail with a raw permission error. Use the shared gate (Sign Up / Log In
        // with a redirect back here) — a dead-end alert would lose the typed message.
        if (!uid) {
            // Carry the report params through the login round-trip, or the submission
            // would come back downgraded to a 'general' message with no target.
            const query = [
                listingId && `listingId=${encodeURIComponent(listingId)}`,
                backTo && `backTo=${encodeURIComponent(backTo)}`,
            ].filter(Boolean).join('&');
            showAuthGate({
                title: 'Sign in required',
                message: 'Sign Up or Log In to send us a message.',
                redirect: `/(tabs)/account/contactUs${query ? `?${query}` : ''}`,
            });
            return;
        }
        setSubmitting(true);
        try {
            await createReport({
                targetType: isReport ? 'listing' : 'general',
                targetId: listingId ?? null,
                reporterId: uid,
                name: name.trim(),
                email: email.trim(),
                message: body.trim(),
            });
            // Navigate right away — the modal host is mounted at the root, so the
            // confirmation survives navigation and a backdrop dismiss can't strand
            // the user on a still-filled form. General contact instead clears the
            // message, so re-sending requires typing a new one.
            if (backTo) {
                submittedRef.current = true;
                router.replace(backTo);
            } else {
                setBody('');
            }
            showAlertModal({
                title: 'Thank you for reaching out!',
                message:
                    'We\'ll review your message and respond within 1–2 business days.\n\nStill need help? Email us at info@getkozy.app',
                buttonText: 'Close',
            });
        } catch (e) {
            showAlertModal({ title: 'Message not sent', message: e?.message ?? 'Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

  return (
    <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ScrollView
            // Bottom clearance from insets — the floating tab bar overlays this screen.
            contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 92 }]}
            keyboardShouldPersistTaps="handled"
        >
        <DisplayField
            title={isReport ? 'Report this listing' : 'Have a question, feedback, or need support?'}
            style={{ marginBottom: 16 }}
        >
        {isReport
            ? 'Tell us what\'s wrong with this listing and we\'ll review it as soon as possible.'
            : 'We\'re here to help. Reach out and we\'ll get back to you as soon as possible.'}
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
            <View style={styles.buttonContainer}>
                <AppButton
                    text="Send Message"
                    size="lg"
                    type='primary'
                    loading={submitting}
                    onPress={handleSubmit}
                />
            </View>
        </View>
        </ScrollView>
        </KeyboardAvoidingView>
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
  }
});
