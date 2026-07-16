import { router } from "expo-router";
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/ui/appText';
import EmptyListingsState from '@/components/ui/emptyListingsState';
import { useAuth } from '@/context/AuthContext';

// Tab bar visibility for post sub-screens is handled centrally in (tabs)/_layout.jsx.
export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppText variant="headline-sm" color="primary">Add New Listing</AppText>
         <EmptyListingsState
          heading="Let’s List Your Space"
          description="Just a few quick steps to share your room with the right people."
          actionText={isLoggedIn ? "Share a room" : "Sign up / Log in"}
          onAction={() => {
            if (isLoggedIn) {
              router.push('/(tabs)/post/stepOne');
            } else {
              router.push('/(auth)/login');
            }
          }}
          imageSource = {require('@/assets/images/3d-house.png')}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container :{
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 56,
    flexDirection: 'column',
  },
});