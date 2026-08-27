// Bottom sheet listing every result inside a tapped map marker (a single pin or a
// grouped cluster). Used by the search preview map and the full-screen map so a
// marker tap previews the area's listings instead of navigating away.
import { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';

import AppText from '@/components/ui/appText';
import ResultVideoCard from '@/components/ui/resultVideoCard';
import { colors } from '@/constants/colors';

const ListingsAreaSheet = forwardRef(({ listings = [], onPressListing, onClose }, ref) => {
  const insets = useSafeAreaInsets();
  const count = listings.length;

  // Small groups don't need a tall sheet — but it must still clear the card's
  // title/price text; larger ones can be expanded to near full height.
  const snapPoints = useMemo(() => (count > 2 ? ['55%', '90%'] : ['52%']), [count]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      )}
    >
      {/* Windowed list: each card mounts an autoplaying video player, so a dense
          cluster (30+ leaves) must only mount the cards actually near the viewport —
          never the whole set at once. */}
      {count > 0 && (
        <BottomSheetFlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 56 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={3}
          removeClippedSubviews
          ListHeaderComponent={
            <AppText variant="body-md-strong" color="primary">
              {count} {count === 1 ? 'listing' : 'listings'} in this area
            </AppText>
          }
          renderItem={({ item }) => (
            <ResultVideoCard item={item} onPress={() => onPressListing?.(item)} />
          )}
        />
      )}
    </BottomSheet>
  );
});

ListingsAreaSheet.displayName = 'ListingsAreaSheet';

export default ListingsAreaSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.semantic.bottomSheet.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    backgroundColor: colors.semantic.bottomSheet.handleIndicator,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  gridRow: {
    gap: 12,
  },
});
