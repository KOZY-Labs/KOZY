import { router } from "expo-router";
import { StyleSheet, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { trustLevelFor } from '@/lib/trustLevel.mjs';

const BACK_TO = '/(tabs)/account/trustLevelInfo';

// This screen is only reachable logged-in (My Page menu), so the guide speaks to a
// member — no guest copy. The level is derived live from the profile.
const LEVELS = [
  {
    level: 1,
    emoji: "🥉",
    title: "Level 1 · Member",
    summary: "You’ve signed up and verified your email.",
    perks: ["Browse every listing", "Save places you like"],
    nextTitle: "To reach Level 2:",
    nextSteps: [
      "Add your profile photo and basic info",
      "Pick your personality and lifestyle",
    ],
    ctaText: "Complete your profile",
  },
  {
    level: 2,
    emoji: "🥈",
    title: "Level 2 · Trusted",
    summary:
      "Your profile is complete — people can see who they’d be living with.",
    perks: [
      "Send and receive chat requests",
      "Post and manage your listings",
      "Better match visibility",
    ],
    nextTitle: "To reach Level 3:",
    nextSteps: [
      "Verify your identity with a government ID (takes a few minutes)",
    ],
    ctaText: "Verify your identity",
    ctaFocus: "verify", // editProfile opens the Persona drawer on arrival
  },
  {
    level: 3,
    emoji: "",
    title: "Level 3 · Verified🛡️",
    summary: "Your identity is verified — the highest level of trust on KOZY.",
    perks: [
      "Verified badge on your profile and listings",
      "Roommates can connect with full confidence",
    ],
    nextTitle: null,
    nextSteps: [],
    ctaText: null,
  },
];

export default function TrustLevelInfo() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const myLevel = trustLevelFor(profile);

  const goEditProfile = (focus) =>
    router.push({
      pathname: '/(tabs)/account/editProfile',
      params: focus ? { backTo: BACK_TO, focus } : { backTo: BACK_TO },
    });

  return (
    <ScrollView
      style={styles.container}
      // Bottom clearance from insets — the floating tab bar overlays this screen.
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 92 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.intro}>
        <AppText variant="headline-md" color="primary">
          Build Trust. Unlock More.
        </AppText>
        <AppText variant="body-sm" color="primary" style={{ marginTop: 8 }}>
          Your trust level shows others how safe it is to connect with you. Complete your
          profile and verify your identity to move up.
        </AppText>
      </View>

      {/* Level guide — the user's own level is highlighted and carries the next-step CTA */}
      <AppText variant="headline-sm" color="primary">
        Trust Level Guide
      </AppText>
      {LEVELS.map((item) => {
        const isMine = item.level === myLevel;
        return (
          <View key={item.level} style={[styles.levelCard, isMine && styles.levelCardActive]}>
            <View style={styles.levelHeader}>
              <AppText variant="body-md-strong" color="primary">
                 {item.title}
              </AppText>
              {isMine && (
                <View style={styles.youBadge}>
                  <AppText variant="button-xsm" color="primary">YOU</AppText>
                </View>
              )}
            </View>
            <AppText variant="body-sm" color="primary" style={{ marginTop: 6 }}>
              {item.summary}
            </AppText>
            <View style={{ marginTop: 10, gap: 4 }}>
              {item.perks.map((perk) => (
                <AppText key={perk} variant="body-sm" color="primary">
                  • {perk}
                </AppText>
              ))}
            </View>
            {item.nextTitle && (
              <View style={{ marginTop: 12 }}>
                <AppText variant="body-sm-strong" color="primary">{item.nextTitle}</AppText>
                <View style={{ marginTop: 4, gap: 4 }}>
                  {item.nextSteps.map((step) => (
                    <AppText key={step} variant="body-sm" color="primary">
                      ✅ {step}
                    </AppText>
                  ))}
                </View>
              </View>
            )}
            {/* Next-step CTA lives on MY level's card only */}
            {isMine && item.ctaText && (
              <View style={styles.cardCta}>
                <AppButton text={item.ctaText} type="primary" onPress={() => goEditProfile(item.ctaFocus)} />
              </View>
            )}
            {isMine && !item.ctaText && (
              <View style={styles.allSetRow}>
                <Feather name="check-circle" size={18} color={colors.base.success} />
                <AppText variant="body-sm-strong" style={{ color: colors.base.success }}>
                  You’re all set
                </AppText>
              </View>
            )}
          </View>
        );
      })}

      <AppButton
        text="Return to My Page"
        type="secondary"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/account');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.base.background,
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    gap: 20,
    paddingTop: 8,
  },
  intro: {
    marginTop: 8,
  },
  cardCta: {
    marginTop: 16,
  },
  allSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  levelCard: {
    borderWidth: 1,
    borderColor: colors.base.gray700,
    borderRadius: 16,
    padding: 16,
  },
  levelCardActive: {
    borderColor: colors.base.accent,
    backgroundColor: colors.base.gray800Alpha,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  youBadge: {
    backgroundColor: colors.base.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
