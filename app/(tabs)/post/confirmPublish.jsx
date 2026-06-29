import { router, usePathname, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, View} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from "@expo/vector-icons";

import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';

export default function ConfrimPublish() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
            <Feather name="check" size={100} color='#ffffff'/>
            <View style={{ marginBottom: 16 }}>
              <AppText 
                variant="headline-sm" 
                color="primary" 
                style={{ textAlign: 'center', maxWidth: 300 }}>
                  Your listing has been published!
              </AppText>
              <AppText 
                variant="body-sm" 
                color="primary" 
                style={{ textAlign: 'center', marginTop: 16, maxWidth: 300 }}>
                  Your room is now live and visible to verified seekers. You can check it anytime or manage it from your listings page.
              </AppText>
            </View>

            <View style={styles.buttonContainer}>
                <AppButton 
                    text='View My List'
                    type='secondary'
                    onPress={() => {
                    router.push(`/(tabs)/post/uploadedPost/${id}`);
                    }} 
                />
                <AppButton 
                    text='Go to My Listings'
                    type='secondary'
                    onPress={() => {
                        router.push("/(tabs)/account/myListings");
                    }} 
                />
            </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container :{
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 56,
    flexDirection: 'column',
  },
  buttonContainer: {
    width: '100%',
    gap: 10
  }
});