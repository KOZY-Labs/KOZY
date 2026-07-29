import { useMemo } from 'react';
import { Platform, StyleSheet, View, Alert, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';

import { useListingDraft } from '@/context/ListingDraftContext';
import { useAuth } from '@/context/AuthContext';
import { draftToPreview } from '@/lib/listingDraft';
import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import DisplayField from '@/components/ui/displayField';
import ProfileSection from '@/components/ui/profileSection';

// Tab bar visibility for post sub-screens is handled centrally in (tabs)/_layout.jsx.
export default function StepFour() {
    const { draft } = useListingDraft();
    const { profile } = useAuth();
    const item = useMemo(() => draftToPreview(draft, profile), [draft, profile]);

  return (
    <View style={{ flex: 1, overflow: 'visible' }}>
        <FlatList 
            data={[{ key: 'content' }]}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="always"
            renderItem={() => (
                <View style={styles.container}>
                    <View style={{ gap: 40 }}>
                        <View style={styles.titleContainer}>
                            <AppText variant='headline-md' color='primary'>Step 4</AppText>
                            <AppText variant='body-sm' color='primary'>Review Your Profile</AppText>
                            <AppText variant='body-xsm' color='primary' style={{ textAlign: 'center' }}>
                                Your profile will appear with your listing. Make sure it looks just right.
                            </AppText>
                        </View>
                        {/* Owner */}
                        <View style={styles.section}>
                            <ProfileSection userId={item.owner.id} listing={item}/>
                        </View>
                        <Pressable 
                            style={styles.replaceButton} 
                            onPress={() => {router.push({
                                pathname: '/(tabs)/account/editProfile',
                                params: {
                                    ownerId: item.owner.id,
                                    backTo: '/(tabs)/post/stepFour',
                                }
                            })}}
                        >
                            <AppText variant='button-sm'>Edit Profile</AppText>
                        </Pressable>
                        <View style={styles.buttonContainer}>
                            <View style={{ flex: 1 }}>
                                <AppButton
                                    text="Cancel"
                                    type='secondary'
                                    onPress={() => {
                                        Alert.alert(
                                            'Exit without saving?',
                                            'Are you sure you want to exit? Your changes may not be saved.',
                                            [{
                                                text: 'Stay'
                                            },
                                            {
                                                text: 'Exit without saving',
                                                style: 'destructive',
                                                onPress: () => {
                                                    router.dismissTo('/(tabs)/post');
                                                },
                                            },]
                                        );  
                                    }}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <AppButton
                                    text="Continue"
                                    onPress={() => router.push('post/previewListing')}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            )}
        />   
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
  },
  buttonContainer:{
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  titleContainer:{
    alignItems: 'center',
    gap: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
  },
  content: {
    flexDirection: 'column',
    gap: 20,
  },
  replaceButton:{
        margin: 'auto',
        borderBottomWidth:1,
        borderColor: '#ffffff'
  },
  section: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    ownerName: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: '50%',
        height: undefined,
        aspectRatio: 1,
        borderRadius: 9999,
        marginHorizontal: 'auto'
    },
});
