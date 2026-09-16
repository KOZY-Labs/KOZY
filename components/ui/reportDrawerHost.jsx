// Global report drawer: reason picker + optional details for listing/user reports.
// Mounted once in app/_layout.jsx (like ConfirmModalHost) so any screen — reel
// overlay, listing detail, chat kebab — opens it imperatively via showReportDrawer()
// without carrying a contactUs round-trip (and its backTo bookkeeping) around.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppDrawer from '@/components/ui/drawer/AppDrawer';
import RadioButton from '@/components/ui/input/radioButton';
import TextArea from '@/components/ui/input/textArea';
import ErrorMessage from '@/components/ui/form/errorMessage';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import { useAuth } from '@/context/AuthContext';
import { createReport } from '@/lib/db/reports';
import { showAuthGate } from '@/lib/authGate';
import { REPORT_REASONS } from '@/constants/data';

let openRef = null;

// target: { targetType: 'listing' | 'user', targetId }
export function showReportDrawer(target) {
  if (!openRef) {
    console.warn('[reportDrawerHost] ReportDrawerHost is not mounted; report dropped.');
    return;
  }
  openRef(target);
}

const COPY = {
  listing: { title: 'Report this listing', gate: 'Sign Up or Log In to report listings.' },
  user: { title: 'Report this user', gate: 'Sign Up or Log In to report users.' },
};

export default function ReportDrawerHost() {
  const { uid, user, profile } = useAuth();
  const drawerRef = useRef(null);
  const [target, setTarget] = useState(null);
  const [reasonCode, setReasonCode] = useState(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Latest auth in a ref so the open handler (registered once) never gates on a
  // stale session.
  const uidRef = useRef(uid);
  uidRef.current = uid;

  useEffect(() => {
    openRef = (next) => {
      // firestore.rules require reporterId == auth.uid — gate before showing the form.
      if (!uidRef.current) {
        const copy = COPY[next.targetType] ?? COPY.listing;
        showAuthGate({ title: copy.title, message: copy.gate });
        return;
      }
      setTarget(next);
      setReasonCode(null);
      setDetails('');
      setError(null);
      drawerRef.current?.snapToIndex(0);
    };
    return () => {
      openRef = null;
    };
  }, []);

  const copy = COPY[target?.targetType] ?? COPY.listing;
  const reasons = REPORT_REASONS.filter((r) => !r.only || r.only === target?.targetType);

  const submit = async () => {
    if (submitting) return;
    if (!reasonCode) {
      setError('Please choose a reason.');
      return;
    }
    setSubmitting(true);
    try {
      await createReport({
        targetType: target.targetType,
        targetId: target.targetId,
        reporterId: uid,
        // Reporter shown to admins by display name — the legal name stays private.
        name: profile?.displayName || profile?.name || '',
        email: user?.email || profile?.email || '',
        reasonCode,
        message: details.trim(),
      });
      drawerRef.current?.close();
      showAlertModal({
        title: 'Thanks for letting us know',
        message: 'We received your report and will review it.',
      });
    } catch (e) {
      showAlertModal({ title: 'Report not sent', message: e?.message ?? 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDrawer
      ref={drawerRef}
      title={copy.title}
      description="Why are you reporting this?"
      primaryActionText={submitting ? 'Submitting…' : 'Submit'}
      primaryAction={submit}
      primaryDisabled={submitting}
      secondaryActionText="Cancel"
      secondaryAction={() => drawerRef.current?.close()}
    >
      <View style={styles.reasons}>
        {reasons.map((r) => (
          <RadioButton
            key={r.value}
            label={r.label}
            selected={reasonCode === r.value}
            onPress={() => {
              setReasonCode(r.value);
              setError(null);
            }}
          />
        ))}
      </View>
      <ErrorMessage message={error} />
      <View style={styles.details}>
        <TextArea
          value={details}
          maxLength={300}
          placeholder="Add details (optional)"
          onChangeText={setDetails}
        />
      </View>
    </AppDrawer>
  );
}

const styles = StyleSheet.create({
  reasons: {
    gap: 16,
  },
  details: {
    marginTop: 20,
  },
});
