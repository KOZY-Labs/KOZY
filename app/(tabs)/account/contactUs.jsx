import { useState } from 'react';
import { Platform, StyleSheet, View, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';


import AppButton from '@/components/ui/appButton';
import TextField from '@/components/ui/input/textField';
import FormField from '@/components/ui/form/formField';
import TextArea from '@/components/ui/input/textArea';
import DisplayField from '@/components/ui/displayField';
import { showAlertModal } from '@/components/ui/confirmModalHost';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactUs() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [body, setBody] = useState('');

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

    const handleSubmit = () => {
        if (!validateForm()) return;

        showAlertModal({
            title: 'Thank you for reaching out!',
            message:
                'We\'ll review your message and respond within 1–2 business days.\n\nStill need help? Email us at support@kozy.com',
            buttonText: 'Close',
        });
    };

  return (
    <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <KeyboardAwareScrollView
            contentContainerStyle={styles.container}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={-50}
        >
        <DisplayField title="Have a question, feedback, or need support?" style={{ marginBottom: 16 }}>
        We’re here to help. Reach out and we’ll get back to you as soon as possible.
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
                    onPress={handleSubmit}
                />
            </View>
        </View>
        </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
    </View>
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
