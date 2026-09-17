import { router } from "expo-router";
import { Linking, Pressable, StyleSheet, Switch, View, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from "@expo/vector-icons";
import * as Notifications from 'expo-notifications';

import AppText from '@/components/ui/appText';
import EmptyListingsState from "@/components/ui/emptyListingsState";
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/auth";
import { updateUserDoc } from "@/lib/db/users";
import { openPrivacyPolicy } from "@/lib/links";

import { avatarSource } from '@/lib/avatar';
import { colors } from '@/constants/colors';
import { TOP_INSET_EXTRA, tabBarClearance } from '@/constants/layout';


export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, profile, uid } = useAuth();
  const currUser = profile;

  const handleLogout = () => {
    showConfirmModal({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      primaryText: 'Log Out',
      secondaryText: 'Cancel',
      onPrimary: async () => {
        try {
          await logout();
        } catch (e) {
          showAlertModal({ title: 'Log out failed', message: e?.message ?? 'Please try again.' });
        }
      },
    });
  };

  if( !isLoggedIn ) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + TOP_INSET_EXTRA }]}>
        <AppText variant="headline-sm" color="primary">My Page</AppText>
        <EmptyListingsState
          heading="Make it yours"
          description="Sign Up or Log In to save and view listings, and manage your profile."
          actionText="Sign Up / Log In"
          onAction={() => router.push('/(auth)/login')}
      />
      </View>
      )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        // Both paddings live on the content container: on Android, padding set on
        // the ScrollView itself shrinks the scrollable area and clips the bottom
        // by that amount, so the last rows ended up hidden under the tab bar.
        paddingTop: insets.top + TOP_INSET_EXTRA,
        // Clear the floating tab bar on every device (S25U gesture nav included).
        paddingBottom: tabBarClearance(insets),
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="headline-sm" color="primary">
        My Page
      </AppText>
      <View style={styles.content}>
        <View style={styles.userInfo}>
          {/* Avatar/name opens Edit Profile; shows the public display name (displayName). */}
          <Pressable
            style={styles.name}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push("/(tabs)/account/editProfile")}
          >
            <View>
              <Image
                source={avatarSource(currUser?.avatar)}
                style={{ width: 55, height: 55, borderRadius: 999 }}
              />
              {currUser?.verified ? (
                <View style={styles.verifiedBadge} accessibilityLabel="Verified">
                  <Feather name="check-circle" size={14} color={colors.base.success} />
                </View>
              ) : null}
            </View>
            <AppText variant="body-md" color="primary">
              {currUser?.displayName || currUser?.firstName || currUser?.name}
            </AppText>
          </Pressable>
        </View>
      </View>
      <View style={styles.manuContainer}>
        <Pressable onPress={() => router.push("/(tabs)/account/editProfile")}>
          <View style={styles.manuButton}>
            <Feather name="edit" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              Edit Profile
            </AppText>
          </View>
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)/account/savedList")}>
          <View style={styles.manuButton}>
            <Feather name="bookmark" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              Saved Listings
            </AppText>
          </View>
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)/account/myListings")}>
          <View style={styles.manuButton}>
            <Feather name="list" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              My Listings
            </AppText>
          </View>
        </Pressable>
      </View>
      <View style={styles.manuContainer}>
        {/* Direct toggle instead of the notification settings page (unwired for now —
              kept for a future granular-preferences revamp). Missing pref = on; the
              push triggers only skip when notifPrefs.push is explicitly false. */}
        <View style={[styles.manuButton, styles.toggleRow]}>
          <View style={styles.toggleLabel}>
            <Feather name="bell" size={20} color="#fff" />
            <AppText variant="body-md" color="primary">
              Push Notifications
            </AppText>
          </View>
          <Switch
            trackColor={{
              false: colors.base.gray800,
              true: colors.base.gray400,
            }}
            thumbColor="#FFFFFF"
            value={currUser?.notifPrefs?.push !== false}
            onValueChange={async (next) => {
              try {
                await updateUserDoc(uid, { notifPrefs: { push: next } });
                // The pref is saved either way (it applies as soon as the OS allows),
                // but turning it on while the system permission is denied delivers
                // nothing — point the user at device settings.
                if (next) {
                  const { granted } = await Notifications.getPermissionsAsync();
                  if (!granted) {
                    showConfirmModal({
                      title: "Notifications are off",
                      message:
                        "Notifications are turned off in your device settings. Enable notifications to receive new messages and listing updates.",
                      primaryText: "Open Settings",
                      secondaryText: "Cancel",
                      onPrimary: () => Linking.openSettings(),
                    });
                  }
                }
              } catch (e) {
                showAlertModal({
                  title: "Update failed",
                  message: e?.message ?? "Please try again.",
                });
              }
            }}
            accessibilityLabel="Push notifications"
          />
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/account/trustLevelInfo")}
        >
          <View style={styles.manuButton}>
            <Feather name="shield" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              Trust Level
            </AppText>
          </View>
        </Pressable>
        <Pressable onPress={openPrivacyPolicy}>
          <View style={styles.manuButton}>
            <Feather name="lock" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              Privacy Policy
            </AppText>
          </View>
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)/account/contactUs")}>
          <View style={styles.manuButton}>
            <Feather name="mail" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              Contact Us
            </AppText>
          </View>
        </Pressable>
      </View>
      <View style={styles.manuContainer}>
        {/* Email / password / delete live one level down — My Page keeps only the
            navigational entry and Log Out. */}
        <Pressable onPress={() => router.push("/(tabs)/account/security")}>
          <View style={styles.manuButton}>
            <Feather name="settings" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              Account & Security
            </AppText>
          </View>
        </Pressable>
        <Pressable onPress={handleLogout}>
          <View style={styles.manuButton}>
            <Feather name="log-out" size={20} color="#fff" />
            <AppText variant="body-md" color="primary" style={styles.manuLabel}>
              Log Out
            </AppText>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container :{
    flex: 1,
    paddingHorizontal: 16,
  },
  imgPlaceHolder:{
    width: 55,
    height: 55,
    backgroundColor: "#f4f4f4",
    borderRadius: 999,
  },
  content: {
    paddingTop: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  name:{
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  manuContainer:{
    marginTop: 36,
    backgroundColor: '#535353', 
    paddingVertical: 12,
    borderRadius: 16,
  },
  manuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  // Android mis-measures some row labels (rendered "Account &", node text intact)
  // when the Text sizes itself; letting it fill the row sidesteps the measurement.
  manuLabel: {
    flex: 1,
  },
  toggleRow: {
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 9999,
    padding: 2,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});