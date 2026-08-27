// Shared listing-detail body used by the home / saved-list / my-listings detail
// screens and the post-flow preview. Screens keep their own data fetching, top bar
// and footer CTAs; this renders everything in between (title → move-in details).
import { memo, useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Image, Dimensions } from 'react-native';

import DisplayField from '@/components/ui/displayField';
import AppText from '@/components/ui/appText';
import ProfileSection from '@/components/ui/profileSection';
import ListingLocationMap from '@/components/ui/listingLocationMap';
import { colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Pages render inside the screen's 16px side padding, so this — not SCREEN_WIDTH —
// is the paging interval; dividing by the full width drifts the dot index on 4+ images.
const PAGE_WIDTH = SCREEN_WIDTH - 32;
const EMPTY_IMAGES = [];

// Owns activeIndex so a swipe only re-renders the carousel — not the MapView,
// profile section, and display fields below it.
const ImageCarousel = memo(function ImageCarousel({ images }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const keyExtractor = useCallback((uri, index) => `${uri}-${index}`, []);
  const renderItem = useCallback(
    ({ item: image }) => (
      <View style={{ width: PAGE_WIDTH }}>
        <Image
          source={{ uri: image }}
          style={styles.fullImage}
          resizeMode="cover"
        />
      </View>
    ),
    []
  );
  const onMomentumScrollEnd = useCallback((e) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / PAGE_WIDTH));
  }, []);

  return (
    <>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.slider}
        renderItem={renderItem}
      />
      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              activeIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>
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
      <ImageCarousel images={images} />

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
            {[`${listing.bedrooms} Bed`, `${listing.bathrooms} Bath`, `${listing.roomType}`, `${listing.sizeSqft} sqft`, listing.furnished ? 'Furnished' : 'Unfurnished', ...(listing.roomDetail ?? [])]}
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
          <AppText variant='body-sm' style={{lineHeight: 14}}>• {listing.availableFrom}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Rent: ${listing.price} / {listing.leaseType === "Month-to-Month" ? "Month" : "Fixed Term"}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Utility: {listing.utilityIncluded ? 'Included' : 'Not Included'}</AppText>
          <AppText variant='body-sm' style={{lineHeight: 14}}>• Deposit: ${listing.deposit}</AppText>
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  slider: {
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 6,
  },
  fullImage: {
    width: '100%',
    height: 260,
    borderRadius: 0,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.base.gray700,
  },
  activeDot: {
    backgroundColor: colors.base.white,
    width: 8,
    height: 8,
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
