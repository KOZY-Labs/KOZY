import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { StyleSheet, View, Image } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "@/components/ui/appButton";
import AppText from "@/components/ui/appText";
import { colors } from '@/constants/colors';

const AUTO_ADVANCE_MS = 3000;

// Success screen shown once email verification is detected. Auto-advances to the final
// onboarding screen after a short celebration, with a Continue button as a fallback.
export default function VerifyComplete() {
  const insets = useSafeAreaInsets();
  const advancedRef = useRef(false);

  const goNext = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    router.replace("/(auth)/signUp/success");
  };

  // No Firestore write here: email verification lives on auth.currentUser.emailVerified,
  // and users.verified is reserved for Persona identity verification.

  // Auto-advance after a brief celebration.
  useEffect(() => {
    const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.topShape} />
      <View style={styles.bottomShape} />
      <View style={styles.content}>
        <View style={styles.topContent}>
          <Image
            source={require('@/assets/images/3d-house.png')}
            style={{ width: 240, height: 240, marginBottom: 24 }}
          />
        </View>
        <View style={styles.bottomContent}>
          <View style={styles.headerContent}>
            <AppText variant="headline-lg" color="secondary" style={{ marginBottom: 12 }}>
              ✅ Email Verified!
            </AppText>
            <AppText
              variant="body-sm"
              color="secondary"
              style={{ marginBottom: 24, textAlign: 'center' }}
            >
              Your email has been verified. Redirecting you…
            </AppText>
          </View>
          <AppButton
            text="Continue"
            onPress={goNext}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "white",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  topContent: {
    width: "100%",
    height: "50%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContent: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    paddingTop: 32,
    width: '100%',
    gap: 12,
  },
  topShape: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: colors.base.accent,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  bottomShape: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '10%',
    backgroundColor: colors.base.accent,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
