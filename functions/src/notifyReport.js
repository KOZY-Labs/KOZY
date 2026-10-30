// New report / Contact Us message → email to the team via Resend's REST API.
// Failures are logged, never thrown: a retried trigger would send duplicates.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');

const REGION = 'us-central1';
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
// Resend's shared sender only delivers to the Resend account's own address
// (info@getkozy.app). After verifying getkozy.app in Resend, switch to
// 'KOZY Reports <reports@getkozy.app>'.
const FROM = 'KOZY Reports <onboarding@resend.dev>';
const TO = 'info@getkozy.app';
const ADMIN_URL = 'https://getkozy.app/admin';

const notifyReportCreated = onDocumentCreated(
  { document: 'reports/{reportId}', region: REGION, secrets: [RESEND_API_KEY] },
  async (event) => {
    const r = event.data?.data();
    if (!r) return;
    const isInquiry = r.targetType === 'general';
    const subject = isInquiry
      ? `[KOZY] New inquiry from ${r.name || 'a user'}`
      : `[KOZY] New ${r.targetType} report — ${r.reasonCode || 'other'}`;
    const text = [
      isInquiry ? 'Contact Us message' : `Reported ${r.targetType}: ${r.targetId}`,
      isInquiry ? null : `Reason: ${r.reasonCode || 'other'}`,
      `Details: ${r.reason || '(none)'}`,
      `From: ${r.name || 'Unknown'} <${r.email || 'no email'}>`,
      '',
      `Open in admin: ${ADMIN_URL}?report=${event.params.reportId}`,
    ]
      .filter((line) => line !== null)
      .join('\n');

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [TO],
          ...(r.email ? { reply_to: r.email } : {}),
          subject,
          text,
        }),
      });
      if (!res.ok) {
        logger.warn('notifyReportCreated: send failed', { status: res.status, body: await res.text() });
      }
    } catch (e) {
      logger.error('notifyReportCreated: send failed', { error: e?.message });
    }
  }
);

module.exports = { notifyReportCreated };
