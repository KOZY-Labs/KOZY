import { memo, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Feather } from '@expo/vector-icons';

import DisplayField from '@/components/ui/displayField';
import AppText from '@/components/ui/appText';
import ProfileSection from '@/components/ui/profileSection';
import ListingLocationMap from '@/components/ui/listingLocationMap';
import MediaViewerModal from '@/components/ui/mediaViewerModal';
import { colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// The body renders inside the screen's 16px side padding.
const PAGE_WIDTH = SCREEN_WIDTH - 32;
const EMPTY_IMAGES = [];
const GAP = 6;
const MAX_TILES = 6;

// Poster-style video tile: a single paused player (no autoplay) showing the first
// frame under a play glyph. Tapping opens the fullscreen viewer.
function VideoTile({ url, width, height, onPress }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = true;
  });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Play listing video"
      style={[styles.tile, { width, height }]}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      <View style={styles.playOverlay} pointerEvents="none">
        <View style={styles.playCircle}>
          <Feather name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </Pressable>
  );
}

// Video on the left (9:16), photos tiled on the right. Adaptive: ≤3 photos stack in
// one column; 4–6 fill a 2×3 grid; beyond 6 the last tile carries a "+N" overlay.
// Every tile opens the same viewer, which pages through video + all photos —
// so a shared link lands on a page where the whole listing is one tap away.
const MediaGallery = memo(function MediaGallery({ videoUrl, images }) {
  const [viewer, setViewer] = useState(null);

  const items = useMemo(
    () => [
      ...(videoUrl ? [{ type: 'video', url: videoUrl }] : []),
      ...images.map((url) => ({ type: 'image', url })),
    ],
    [videoUrl, images]
  );

  const hasVideo = !!videoUrl;
  const videoW = hasVideo ? Math.round(PAGE_WIDTH * 0.46) : 0;
  const height = hasVideo ? Math.round((videoW * 16) / 9) : Math.round(PAGE_WIDTH * 0.75);
  const gridW = hasVideo ? PAGE_WIDTH - videoW - GAP : PAGE_WIDTH;

  const shown = images.slice(0, MAX_TILES);
  const extra = images.length - shown.length;
  const columns = shown.length > 3 ? 2 : 1;
  // Rows follow the count so 4 photos fill 2 rows instead of leaving a third
  // empty; an odd last photo spans the full row width.
  const rows = Math.max(Math.ceil(shown.length / columns), 1);
  const tileW = (gridW - GAP * (columns - 1)) / columns;
  const tileH = (height - GAP * (rows - 1)) / rows;
  const lastSpansRow = columns === 2 && shown.length % 2 === 1;

  if (!hasVideo && images.length === 0) return null;

  return (
    <>
      <View style={[styles.gallery, { height }]}>
        {hasVideo ? (
          <VideoTile
            url={videoUrl}
            width={videoW}
            height={height}
            onPress={() => setViewer({ type: 'video', url: videoUrl })}
          />
        ) : null}
        <View style={[styles.grid, { width: gridW }]}>
          {shown.map((url, index) => {
            const isLast = index === shown.length - 1;
            return (
              <Pressable
                key={`${url}-${index}`}
                onPress={() => setViewer({ type: 'image', url })}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Listing photo ${index + 1} of ${images.length}`}
                style={[styles.tile, { width: isLast && lastSpansRow ? gridW : tileW, height: tileH }]}
              >
                <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                {isLast && extra > 0 ? (
                  <View style={styles.moreOverlay} pointerEvents="none">
                    <AppText variant="headline-sm" textColor="#fff">+{extra}</AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <MediaViewerModal media={viewer} items={items} onClose={() => setViewer(null)} />
    </>
  );
});

// Memoized: parent screens flip local state (requesting, isSaved) that shouldn't
// re-render the MapView and field stack below.
export default memo(function ListingDetailBody({ listing }) {
  const images = listing.images ?? EMPTY_IMAGES;

  return (
    <>
      <AppText variant='headline-sm'>{listing.title}</AppText>
      <AppText variant='body-sm'>${listing.price}</AppText>
      <MediaGallery videoUrl={listing.videoUrl ?? null} images={images} />

      {/* Details */}
      <View style={styles.content}>
        <DisplayField title="Location">
          {`${listing.street}, ${listing.city}, ${listing.province}`}
        </DisplayField>
        {/* Tap opens a full-screen map with just this listing's pin */}
        <ListingLocationMap latitude={listing.latitude} longitude={listing.longitude} />

        {/* Owner */}
        <View style={styles.section}>
          <AppText variant='headline-sm'>Meet Your Roommate</AppText>

          <ProfileSection listing={listing} />

          <DisplayField title="About Room & House" type="pill">
            {[
              listing.bedrooms > 0 ? `${listing.bedrooms} Bed` : null,
              listing.bathrooms > 0 ? `${listing.bathrooms} Bath` : null,
              listing.roomType,
              listing.sizeSqft > 0 ? `${listing.sizeSqft} sqft` : null,
              listing.furnished ? 'Furnished' : 'Unfurnished',
              ...(listing.roomDetail ?? []),
            ]}
          </DisplayField>

          <DisplayField title="Looking For" type="pill">
            {listing.lookingFor}
          </DisplayField>

          {listing.description ? (
            <DisplayField title="Description">
              {listing.description}
            </DisplayField>
          ) : null}
          <AppText variant="body-sm-strong">Move-in Details</AppText>
          {listing.availableFrom ? (
            <AppText variant='body-sm' style={{lineHeight: 14}}>• {listing.availableFrom}</AppText>
          ) : null}
          {listing.price > 0 ? (
            <AppText variant='body-sm' style={{lineHeight: 14}}>• Rent: ${listing.price} / {listing.leaseType === "Month-to-Month" ? "Month" : "Fixed Term"}</AppText>
          ) : null}
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Utility: {listing.utilityIncluded ? 'Included' : 'Not Included'}</AppText>
          {listing.deposit != null && listing.deposit !== '' && listing.deposit !== 0 ? (
            <AppText variant='body-sm' style={{lineHeight: 14}}>• Deposit: ${listing.deposit}</AppText>
          ) : null}
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  gallery: {
    flexDirection: 'row',
    gap: GAP,
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    alignContent: 'flex-start',
  },
  tile: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.base.gray800,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  content: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 20,
  },
});
