import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Platform, StyleSheet, View, FlatList, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';

import { useListingDraft } from '@/context/ListingDraftContext';
import { usePostFlowExit } from '@/hooks/use-post-flow-exit';
import { useAuth } from '@/context/AuthContext';
import { draftToPreview } from '@/lib/listingDraft';

import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import InfoList from '@/components/ui/appList';
import AppDrawer from '@/components/ui/drawer/AppDrawer';
import FormField from '@/components/ui/form/formField';
import { showAlertModal } from '@/components/ui/confirmModalHost';
import { colors } from '@/constants/colors';
import ListingReelOverlay from '@/components/ui/listingReelOverlay';
import { validateVideo } from '@/utils/mediaValidation';

const SAMPLE_VIDEOS = [
    {
        id: 'sample-room-1',
        source: require('@/assets/videos/sample-room1.mp4'),
    },
    {
        id: 'sample-room-2',
        source: require('@/assets/videos/sample-room2.mp4'),
    },
];

function SampleVideo({ source, isActive, isScreenFocused, width }) {
    const player = useVideoPlayer(source, (videoPlayer) => {
        videoPlayer.loop = true;
        videoPlayer.muted = true;
    });
    // This step stays mounted under step 4 / preview, so a merely-paused player
    // keeps its video decoder alive for the rest of the flow. Unload while the
    // screen is off-focus to free the codec (see the home feed for the same fix).
    const unloadedRef = useRef(false);

    useEffect(() => {
        if (!isScreenFocused) {
            unloadedRef.current = true;
            player.replaceAsync(null).catch(() => {});
            return;
        }
        const resume = () => {
            if (isActive) {
                player.play();
            } else {
                player.pause();
            }
        };
        if (unloadedRef.current) {
            unloadedRef.current = false;
            player.replaceAsync(source).then(resume).catch(() => {});
        } else {
            resume();
        }
    }, [isActive, isScreenFocused, player, source]);

    return (
        <View style={[styles.sampleVideoFrame, { width }]}>
            <VideoView
                player={player}
                style={styles.sampleVideo}
                contentFit="cover"
                nativeControls={false}
            />
        </View>
    );
}

export default function StepThree() {
    const isScreenFocused = useIsFocused();
    const { draft, setVideo } = useListingDraft();
    const { confirmExit } = usePostFlowExit();
    const { profile } = useAuth();
    const [selectedVideo, setSelectedVideo] = useState(draft.video ?? null);
    const [videoError, setVideoError] = useState(null);
    const [activeSampleIndex, setActiveSampleIndex] = useState(0);
    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const sampleVideoWidth = Math.min(screenWidth - 96, 360);
    const item = useMemo(() => draftToPreview(draft, profile), [draft, profile]);
    const drawerRef = useRef(null);
    const selectedVideoPlayer = useVideoPlayer(
            selectedVideo?.uri ?? null,
            (player) => {
                player.loop = true;
                player.muted = true;
            }
            );

    // Auto-play the preview: load the picked video and start it (handles re-selection too).
    useEffect(() => {
        if (!selectedVideoPlayer || !selectedVideo?.uri) return;
        try {
            selectedVideoPlayer.replace(selectedVideo.uri);
        } catch {
            // first render already created the player with this source
        }
        selectedVideoPlayer.play();
    }, [selectedVideo, selectedVideoPlayer]);

    const openAlbum = async () => {
        const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            showAlertModal({
                title: 'Permission required',
                message: 'We need access to your photos to upload a file.',
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: false,
            quality: 1,
        });

        if (result.canceled) return;

        const asset = result.assets[0];
        // Reject before saving to the draft — a bad video must not reach the preview or upload.
        const problem = validateVideo(asset);

        if (problem) {
            setVideoError(problem);
            return;
        }

        setVideoError(null);
        setSelectedVideo(asset);
        setVideo(asset); // persist to the draft immediately
        // Open the preview at the top snap point so it's fully visible right away.
        drawerRef.current?.snapToIndex(1);
    };


    // Returning to this step (e.g. Back from step 4) with a previously chosen video:
    // reopen the preview so the selection is visible again instead of looking lost.
    // On blur, unload the preview's source — this screen stays mounted under the
    // rest of the flow and a paused player would hold its video decoder open.
    // (Tab bar visibility for post sub-screens is handled in (tabs)/_layout.jsx.)
    useFocusEffect(
        useCallback(() => {
            if (!selectedVideo?.uri) return undefined;
            const t = setTimeout(() => {
                drawerRef.current?.snapToIndex(1);
                selectedVideoPlayer
                    ?.replaceAsync(selectedVideo.uri)
                    .then(() => selectedVideoPlayer?.play())
                    .catch(() => {});
            }, 0);
            return () => {
                clearTimeout(t);
                selectedVideoPlayer?.replaceAsync(null).catch(() => {});
            };
        }, [selectedVideo, selectedVideoPlayer])
    );


  return (
    <View style={{ flex: 1, overflow: "visible" }}>
      <FlatList
        data={[{ key: "content" }]}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="always"
        renderItem={() => (
          <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={{ paddingHorizontal: 24, gap: 40 }}>
              <View style={styles.titleContainer}>
                <AppText variant="headline-md" color="primary">
                  Step 3
                </AppText>
                <AppText
                  variant="body-md"
                  color="primary"
                  style={{ textAlign: "center" }}
                >
                  Show your space in motion. One smooth, vertical video that
                  shows the full space.
                </AppText>
              </View>
                <FormField label="" error={videoError} lastField>
                  <AppButton text="Upload Video" onPress={openAlbum} />
                </FormField>
              <InfoList
                listStyle={{ color: colors.semantic.text.tertiary }}
                titleStyle={{ color: colors.semantic.text.tertiary }}
                title="💡 Video Requirements"
                items={[
                  "Shoot in portrait mode (vertical)",
                  "Walk steadily through the space (like a live tour)",
                  "Include bedroom, bathroom, kitchen, common areas",
                  "Keep it under 1 minute",
                ]}
              />
              <View>
                <AppText
                  variant="body-sm-strong"
                  color="primary"
                  style={{
                    marginBottom: 16,
                    color: colors.semantic.text.tertiary,
                  }}
                >
                  💿 Sample Tour Videos
                </AppText>
                <View style={styles.carousel}>
                  <FlatList
                    data={SAMPLE_VIDEOS}
                    horizontal
                    pagingEnabled
                    bounces={false}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(sample) => sample.id}
                    style={{ width: sampleVideoWidth }}
                    onMomentumScrollEnd={(event) => {
                      const nextIndex = Math.round(
                        event.nativeEvent.contentOffset.x / sampleVideoWidth,
                      );
                      setActiveSampleIndex(nextIndex);
                    }}
                    renderItem={({ item: sample, index }) => (
                      <SampleVideo
                        source={sample.source}
                        isActive={index === activeSampleIndex}
                        isScreenFocused={isScreenFocused}
                        width={sampleVideoWidth}
                      />
                    )}
                  />
                  <View
                    style={styles.pagination}
                    accessibilityLabel={`Sample video ${activeSampleIndex + 1} of ${SAMPLE_VIDEOS.length}`}
                  >
                    {SAMPLE_VIDEOS.map((sample, index) => (
                      <View
                        key={sample.id}
                        style={[
                          styles.paginationDot,
                          index === activeSampleIndex &&
                            styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <AppDrawer
        ref={drawerRef}
        snapPoints={["50%", "100%"]}
        title="Preview Tour Video"
      >
        <View style={styles.sheetContent}>
          {selectedVideo && (
            <View style={styles.previewWrapper}>
              <VideoView
                player={selectedVideoPlayer}
                style={styles.previewVideo}
                contentFit="cover"
                nativeControls={false}
              />
              {/* Overlay is display-only in the preview — block all touches. */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <ListingReelOverlay
                  item={item}
                  bottom={20}
                  showMoreAction
                  showSaveAction
                  showShareAction
                />
              </View>
            </View>
          )}
          <Pressable
            style={styles.replaceButton}
            onPress={() => {
              drawerRef.current?.close();
              openAlbum();
            }}
          >
            <AppText variant="button-sm">Replace Video</AppText>
          </Pressable>

          <View style={styles.sheetButtons}>
            <View style={{ flex: 1 }}>
              <AppButton text="Cancel" type="secondary" onPress={confirmExit} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                text="Continue"
                state={selectedVideo ? "normal" : "disabled"}
                onPress={() => {
                  if (!selectedVideo) return;
                  setVideo(selectedVideo);
                  drawerRef.current?.close();
                  router.push("post/stepFour");
                }}
              />
            </View>
          </View>
        </View>
      </AppDrawer>
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
    marginTop: 24,
  },
  titleContainer:{
    alignItems: 'center',
    gap: 8,
  },
  carousel: {
    alignItems: 'center',
  },
  sampleVideoFrame: {
    aspectRatio: 9 / 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.semantic.text.tertiary,
    overflow: 'hidden',
    backgroundColor: colors.semantic.bg.grey,
  },
  sampleVideo: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.base.gray700,
  },
  paginationDotActive: {
    backgroundColor: colors.base.white,
  },
    sheetContent: {
        marginTop: -20,
        gap: 20,
    },

    previewWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'black',
        borderWidth:1,
        borderColor: colors.semantic.input.border.normal.color,
    },

    previewVideo: {
        width: '100%',
        aspectRatio: 9 / 16,
    },

    sheetButtons: {
        width: '100%',
        flexDirection: 'row',
        gap: 12,
    },
    replaceButton:{
        margin: 'auto',
        borderBottomWidth:1,
        borderColor: '#ffffff'
    },
    bottomLeft: {
        position: 'absolute',
        left: 20,
        maxWidth: '70%',
    },
    bottomCTA: {
        marginTop: 12,
        width: 67,
    },
    rightActions: {
        position: 'absolute',
        right: 20,
        gap: 12,
        alignItems: 'center',
  },
});
