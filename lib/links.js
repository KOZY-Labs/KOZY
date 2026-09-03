// External links opened in the in-app browser (expo-web-browser) so the user
// never leaves the app. URL comes from env with a hardcoded fallback — a missing
// env var must not turn legal links into dead buttons.
import * as WebBrowser from 'expo-web-browser';

export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://getkozy.app/privacy-policy';

export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://getkozy.app/terms';

export function openPrivacyPolicy() {
  return WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => {});
}

export function openTerms() {
  return WebBrowser.openBrowserAsync(TERMS_URL).catch(() => {});
}
