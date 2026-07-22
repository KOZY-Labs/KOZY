// Persona hosted-flow identity verification.
// Opens the Persona inquiry in an auth session and parses the redirect result.
// NOTE: client-parsed status is a P1 convenience — tamper-proof verification needs
// a Persona webhook -> Cloud Function writing users.verified server-side.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const PERSONA_BASE_URL = 'https://inquiry.withpersona.com/verify';

// referenceId should be the Firebase uid so the inquiry links back to the user.
// Returns { type: 'completed' | 'pending' | 'failed' | 'cancel', inquiryId }.
export async function startPersonaVerification(referenceId) {
  const templateId = process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID;
  const environmentId = process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT_ID;
  if (!templateId || !environmentId) {
    throw new Error(
      'Persona is not configured. Set EXPO_PUBLIC_PERSONA_TEMPLATE_ID and EXPO_PUBLIC_PERSONA_ENVIRONMENT_ID in .env.local and restart Metro.'
    );
  }

  // kozy://persona-verification — must be allowlisted in the Persona template's
  // redirect URLs. Requires the dev client / standalone build (not Expo Go).
  const redirectUri = Linking.createURL('persona-verification');

  const params = new URLSearchParams({
    'inquiry-template-id': templateId,
    'environment-id': environmentId,
    'reference-id': referenceId,
    'redirect-uri': redirectUri,
  });

  const result = await WebBrowser.openAuthSessionAsync(
    `${PERSONA_BASE_URL}?${params.toString()}`,
    redirectUri
  );

  if (result.type !== 'success' || !result.url) {
    return { type: 'cancel', inquiryId: null };
  }

  // Persona appends inquiry-id and status (completed | pending | needs_review | failed)
  // to the redirect URL.
  const { queryParams } = Linking.parse(result.url);
  const status = queryParams?.status ?? null;
  const inquiryId = queryParams?.['inquiry-id'] ?? null;

  if (status === 'completed') return { type: 'completed', inquiryId };
  if (status === 'failed' || status === 'expired') return { type: 'failed', inquiryId };
  // pending / needs_review / unknown — submitted but not yet decided.
  return { type: 'pending', inquiryId };
}
