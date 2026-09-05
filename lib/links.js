// External links opened in the in-app browser (expo-web-browser) so the user
// never leaves the app. URL comes from env with a hardcoded fallback — a missing
// env var must not turn legal links into dead buttons.
import * as WebBrowser from 'expo-web-browser';

export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://getkozy.app/privacy-policy';

export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://getkozy.app/terms';

// Public web URL for a listing — Universal/App Links open it in the app when
// installed; the website serves a landing page (website/listing.html) otherwise.
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://getkozy.app';

export function listingShareUrl(listingId) {
  return `${SITE_URL}/listing/${listingId}`;
}

export function openPrivacyPolicy() {
  return WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => {});
}

export function openTerms() {
  return WebBrowser.openBrowserAsync(TERMS_URL).catch(() => {});
}
