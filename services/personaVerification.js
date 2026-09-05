// Persona hosted-flow identity verification.
// Opens the Persona inquiry in an auth session and parses the redirect result.
// NOTE: client-parsed status is a UX convenience — tamper-proof verification is the
// Persona webhook (functions/src/personaWebhook.js) writing users.verified server-side.
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const PERSONA_BASE_URL = 'https://inquiry.withpersona.com/verify';

// On Android the redirect can reach the app as a plain deep link without
// openAuthSessionAsync ever seeing it (the custom tab reports "dismissed" and the
// session resolves as cancel). The kozy://persona-verification route therefore
// hands its query params to whichever startPersonaVerification call is pending,
// and the session result races against that delivery.
let deliverRedirect = null;

// Called by app/persona-verification.jsx with the route's search params.
// Returns true when a pending verification consumed them.
export function deliverPersonaRedirect(params) {
  if (!deliverRedirect) return false;
  deliverRedirect(params);
  deliverRedirect = null;
  return true;
}

// "Show the verified drawer when the webhook lands" flag. Module-level, not screen
// state: the Persona deep link rebuilds the navigation stack, so the editProfile
// instance that launched verification is not the one that celebrates it. Set BEFORE
// the browser opens (so it can't race the webhook), cleared on cancel/failure, and
// timestamped so an unconsumed flag can't pop the drawer on some much-later visit.
const AWAITING_TTL_MS = 10 * 60 * 1000;
let awaitingVerificationSince = 0;

export function setAwaitingVerification(value) {
  awaitingVerificationSince = value ? Date.now() : 0;
}

// Reads and clears in one step so the drawer opens exactly once.
export function consumeAwaitingVerification() {
  const fresh =
    awaitingVerificationSince > 0 && Date.now() - awaitingVerificationSince < AWAITING_TTL_MS;
  awaitingVerificationSince = 0;
  return fresh;
}

// Persona appends inquiry-id and status (completed | pending | needs_review | failed
// | expired) to the redirect. Params may come from the parsed redirect URL or from
// the deep-link route's search params — same keys either way.
function resultFromParams(queryParams) {
  const status = queryParams?.status ?? null;
  const inquiryId = queryParams?.['inquiry-id'] ?? null;
  if (status === 'completed') return { type: 'completed', inquiryId };
  if (status === 'failed' || status === 'expired') return { type: 'failed', inquiryId };
  // pending / needs_review / unknown — submitted but not yet decided.
  return { type: 'pending', inquiryId };
}

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

  const redirected = new Promise((resolve) => {
    deliverRedirect = (p) => resolve({ from: 'route', params: p });
  });
  const session = WebBrowser.openAuthSessionAsync(
    `${PERSONA_BASE_URL}?${params.toString()}`,
    redirectUri
  ).then((r) => ({ from: 'session', result: r }));

  try {
    let winner = await Promise.race([redirected, session]);

    if (winner.from === 'session') {
      if (winner.result.type === 'success' && winner.result.url) {
        return resultFromParams(Linking.parse(winner.result.url).queryParams);
      }
      // The browser reported a dismissal — but on Android that also happens when the
      // redirect closed the tab, with the deep link still in flight. Give the route
      // a short grace window before treating it as a real user cancel.
      winner = await Promise.race([
        redirected,
        new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
      if (!winner) return { type: 'cancel', inquiryId: null };
    }

    return resultFromParams(winner.params);
  } finally {
    deliverRedirect = null;
  }
}
