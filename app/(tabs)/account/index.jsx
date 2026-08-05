import { router } from "expo-router";
import { Pressable, StyleSheet, View, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from "@expo/vector-icons";

import AppText from '@/components/ui/appText';
import EmptyListingsState from "@/components/ui/emptyListingsState";
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/auth";

const AVATAR_PLACEHOLDER = require('@/assets/images/Avatar-placeholder.png');


export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, profile } = useAuth();
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
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
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 84 }}
      showsVerticalScrollIndicator={false}
    >
        <AppText variant="headline-sm" color="primary">My Page</AppText>
        <View style={styles.content}>
          <View style={styles.userInfo}>
            {/* Avatar/name opens Edit Profile; shows the public display name (nickname). */}
            <Pressable
              style={styles.name}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => router.push('/(tabs)/account/editProfile')}
            >
              <Image
                source={currUser?.avatar?.[0] ? { uri: currUser.avatar[0] } : AVATAR_PLACEHOLDER}
                style={{ width: 55, height: 55, borderRadius: 999 }}
              />
              <AppText variant="body-md" color="primary">
                {currUser?.nickname ?? currUser?.firstName ?? currUser?.name}
              </AppText>
            </Pressable>
          </View>
        </View>
        <View style={styles.manuContainer}>
          <Pressable onPress={() => router.push('/(tabs)/account/editProfile')}>
            <View style={styles.manuButton}>
              <Feather name="edit" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Edit Profile
              </AppText>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/account/savedList')}>
            <View style={styles.manuButton}>
              <Feather name="bookmark" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Saved Listings
              </AppText>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/account/myListings')}>
            <View style={styles.manuButton}>
              <Feather name="list" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                My Listings
              </AppText>
            </View>
          </Pressable>
        </View>
        <View style={styles.manuContainer}>
          <Pressable onPress={() => router.push('/(tabs)/account/trustLevelInfo')}>
            <View style={styles.manuButton}>
              <Feather name="shield" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Trust Level
              </AppText>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/account/notification')}>
            <View style={styles.manuButton}>
              <Feather name="bell" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Notification
              </AppText>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/account/privacyPolicy')}>
            <View style={styles.manuButton}>
              <Feather name="lock" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Privacy Policy              
              </AppText>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/account/contactUs')}>
            <View style={styles.manuButton}>
              <Feather name="mail" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Contact Us
              </AppText>
            </View>
          </Pressable>
        </View>
        <View style={styles.manuContainer}>
          <Pressable onPress={handleLogout}>
            <View style={styles.manuButton}>
              <Feather name="log-out" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Log Out
              </AppText>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/account/deleteAccount')}>
            <View style={styles.manuButton}>
              <Feather name="trash-2" size={20} color='#fff' />
              <AppText variant="body-md" color="primary">
                Delete Account
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
  }
});