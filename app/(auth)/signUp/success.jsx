
import { router } from "expo-router";
import { StyleSheet, View, Image } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "@/components/ui/appButton";
import AppText from "@/components/ui/appText";
import { colors } from '@/constants/colors';


export default function Success() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, {paddingBottom: insets.bottom }]}>
      {/* custom Background shapes */}
      <View style={styles.topShape} />
      <View style={styles.bottomShape} />
      <View style={styles.content}>
        <View style={styles.topContent}>
          <Image
            source={require('@/assets/images/3d-house.png')}
            style={{ width: 240, height: 240, marginBottom: 24 }}
          />
        </View>
        <View style={[styles.bottomContent]}>
          <View style={styles.headerContent}>
            <AppText variant="headline-lg" color="secondary" style={{ marginBottom: 12 }}>
                🎉 You&apos;re all set!
            </AppText>
            <AppText variant="body-sm" color="secondary" style={{ marginBottom: 24, textAlign: 'center' }}>
            Start exploring and connect with your future roommate now!
            </AppText>
          </View>
          <AppButton
            text="Complete My Profile"
            // Replace so the signup stack is gone; back from Edit Profile lands on My Page.
            onPress={() =>
              router.replace({
                pathname: "/(tabs)/account/editProfile",
                params: { backTo: "/(tabs)/account" },
              })
            }
          />
          <AppButton
            text="Later & Back to Home"
            onPress={() => router.replace("/(tabs)/home")}
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
    height:"50%", 
    alignItems: "center", 
    justifyContent: "flex-end",
  },
  headerContent:{
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
  imagePlaceHolder: {
    width: 120,   
    height: 120,
    backgroundColor: '#E0E0E0',
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