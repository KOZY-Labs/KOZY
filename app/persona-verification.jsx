// Landing route for the Persona hosted-flow redirect (kozy://persona-verification).
// On Android the redirect often arrives as a plain deep link while
// openAuthSessionAsync resolves as a dismissal, so this route is the reliable
// carrier of the result: it hands its query params (status, inquiry-id) to the
// pending startPersonaVerification call, then returns to the launching screen
// (editProfile) with its state — and the verification drawer wiring — intact.
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { deliverPersonaRedirect } from '@/services/personaVerification';

WebBrowser.maybeCompleteAuthSession();

export default function PersonaVerificationReturn() {
  const params = useLocalSearchParams();

  useEffect(() => {
    deliverPersonaRedirect(params);
    // Always land on editProfile: the deep link rebuilt the navigation stack, so
    // back() would surface whatever the reset stack holds (observed: home).
    router.replace('/(tabs)/account/editProfile');
    // Deliver exactly once, on mount — params are stable for this navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
