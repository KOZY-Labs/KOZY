// Bottom sheet listing every result inside a tapped map marker (a single pin or a
// grouped cluster). Used by the search preview map and the full-screen map so a
// marker tap previews the area's listings instead of navigating away.
import { forwardRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';

import AppText from '@/components/ui/appText';
import ResultVideoCard from '@/components/ui/resultVideoCard';
import { colors } from '@/constants/colors';

const ListingsAreaSheet = forwardRef(({ listings = [], onPressListing, onClose }, ref) => {
  const insets = useSafeAreaInsets();
  const count = listings.length;
  // One inline preview at a time (see ResultVideoCard).
  const [previewId, setPreviewId] = useState(null);

  // Fixed snap points on purpose: deriving them from `count` reconfigured the
  // sheet mid-open (0 → N changes the array), which fired a spurious onClose and
  // blanked the freshly shown listings.
  const snapPoints = ['55%', '90%'];

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
      {/* Windowed list so a dense cluster (30+ leaves) only mounts cards near the
          viewport. Rendered unconditionally (empty data mounts no cards): gating it
          on count>0 made the very first open mount the content and snap in the same
          pass, and the snap was dropped — the first pin tap did nothing until a
          second tap. */}
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
            <ResultVideoCard
              item={item}
              previewing={previewId === item.id}
              onTogglePreview={() => setPreviewId((current) => (current === item.id ? null : item.id))}
              onPress={() => {
                setPreviewId(null);
                onPressListing?.(item);
              }}
            />
          )}
        />
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
