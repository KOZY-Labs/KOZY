// Bottom sheet listing every result inside a tapped map marker (a single pin or a
// grouped cluster). Used by the search preview map and the full-screen map so a
// marker tap previews the area's listings instead of navigating away.
import { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import AppText from '@/components/ui/appText';
import ResultVideoCard from '@/components/ui/resultVideoCard';
import { colors } from '@/constants/colors';

const ListingsAreaSheet = forwardRef(({ listings = [], onPressListing, onClose }, ref) => {
  const count = listings.length;

  // Small groups don't need a tall sheet; larger ones can be expanded to near full height.
  const snapPoints = useMemo(() => (count > 2 ? ['55%', '90%'] : ['45%']), [count]);

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
      {/* Only render (and mount video players) while the sheet actually has content. */}
      {count > 0 && (
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="body-md-strong" color="primary">
            {count} {count === 1 ? 'listing' : 'listings'} in this area
          </AppText>

          <View style={styles.grid}>
            {listings.map((item) => (
              <ResultVideoCard
                key={item.id}
                item={item}
                onPress={() => onPressListing?.(item)}
              />
            ))}
          </View>
        </BottomSheetScrollView>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
