import { useState } from 'react';
import { Platform, StyleSheet, View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import MediaInput from '@/components/ui/input/mediaInput';
import AddedPhotoGrid from '@/components/ui/input/addedPhotoGrid';
import InfoList from '@/components/ui/appList';
import { colors } from '@/constants/colors';
import validateImage from '@/utils/mediaValidation';
import { useListingDraft } from '@/context/ListingDraftContext';
import { usePostFlowExit } from '@/hooks/use-post-flow-exit';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 9;

function createPendingPhoto(asset, index) {
  return {
    // `||` (not `??`) so an empty-string assetId (seen on iOS) also falls back —
    // otherwise every photo shares id '' and deleting one removes all of them.
    id: asset.assetId || `${asset.uri}-${index}-${Date.now()}`,
    uri: asset.uri,
    previewUri: asset.uri,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    fileSize: asset.fileSize ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    uploadStatus: 'pending',
    remoteUrl: null,
  };
}

export default function StepTwo() {
    const { draft, setPhotos: savePhotosToDraft } = useListingDraft();
    const { confirmExit } = usePostFlowExit();
    const [error, setError] = useState(null);
    const [photos, setPhotos] = useState(draft.photos ?? []);

    const insets = useSafeAreaInsets();

    const openGallery = async () => {
        const availableSlots = MAX_PHOTOS - photos.length;

        if (availableSlots <= 0) {
            setError(`You can upload up to ${MAX_PHOTOS} photos.`);
            return;
        }

        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    'Photo access required',
                    'Allow photo library access to add photos to your listing.'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                selectionLimit: availableSlots,
                quality: 1,
            });

            if (result.canceled) return;

            const selectedPhotos = result.assets.map(createPendingPhoto);
            const invalidPhoto = selectedPhotos.find(photo => validateImage(photo));

            if (invalidPhoto) {
                setError(validateImage(invalidPhoto));
                return;
            }

            setPhotos(currentPhotos => {
                const existingUris = new Set(currentPhotos.map(photo => photo.uri));
                const uniquePhotos = selectedPhotos.filter(photo => !existingUris.has(photo.uri));
                return [...currentPhotos, ...uniquePhotos].slice(0, MAX_PHOTOS);
            });
            setError(null);
        } catch {
            Alert.alert(
                'Unable to open gallery',
                'Please try selecting your photos again.'
            );
        }
    };

    const confirmDeletePhoto = (photo) => {
        Alert.alert(
            'Delete photo?',
            'This photo will be removed from your listing.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setPhotos(currentPhotos =>
                            currentPhotos.filter(item => item.id !== photo.id)
                        );
                        setError(null);
                    },
                },
            ]
        );
    };

    const continueToNextStep = () => {
        if (photos.length < MIN_PHOTOS) {
            setError(`Add at least ${MIN_PHOTOS} photos to continue.`);
            return;
        }

        savePhotosToDraft(photos);
        router.push('/post/stepThree');
    };


  return (
    <ScrollView 
        contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
    >   
        <View style={{ paddingHorizontal: 24, gap: 40 }}>
            <View style={styles.titleContainer}>
                <AppText variant='headline-md' color='primary'>Step 2</AppText>
                <AppText variant='body-md' color='primary' style={{textAlign: 'center'}}>Show your space. Clear photos help others feel confident.</AppText>
            </View>
            <InfoList
                listStyle={{color: colors.semantic.text.tertiary}}
                titleStyle={{color: colors.semantic.text.tertiary}}
                title="💡Tips"
                items={[
                    'Upload at least 3 photos',
                    'Include views of the room, common areas, bathroom, and building (if applicable)',
                ]}
            />
            <View style={{ minHeight: 280, paddingHorizontal: 8 }}>
                {photos.length === 0 ? (
                    <MediaInput
                        error={!!error}
                        onPress={openGallery}
                    />
                ) : (
                    <AddedPhotoGrid
                        photos={photos}
                        maxPhotos={MAX_PHOTOS}
                        onAdd={openGallery}
                        onDelete={confirmDeletePhoto}
                    />
                )}
                {!!error && (
                    <AppText
                        variant="body-xsm"
                        color="error"
                        accessibilityRole="alert"
                        style={styles.errorText}
                    >
                        {error}
                    </AppText>
                )}
            </View>
        </View>
        <View style={styles.buttonContainer}>
            <View style={{ flex: 1 }}>
                <AppButton
                    text="Cancel"
                    type="secondary"
                    onPress={confirmExit}
                />
            </View>
            <View style={{ flex: 1 }}>
                <AppButton text="Continue" onPress={continueToNextStep}/>
            </View>
        </View>
    </ScrollView>
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
    marginTop: 24,
  },
  titleContainer:{
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    marginTop: 8,
  },
});
