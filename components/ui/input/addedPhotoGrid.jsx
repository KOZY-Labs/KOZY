import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { DraggableGrid } from 'react-native-draggable-grid';

import { colors } from '@/constants/colors';

const COLUMNS = 3;
const GAP = 6;

// Photo grid with long-press drag-to-reorder, built on react-native-draggable-grid
// (the same setup proven in JOOPI's PhotoGrid). The library lays items out in equal
// cells of (gridWidth / numColumns) × itemHeight and centers each item inside its
// cell, so the cell carries the gap and the rendered tile is slightly smaller.
// The trailing "+" tile is pinned: it can't be dragged and nothing can displace it.
export default function AddedPhotoGrid({
  photos,
  onAdd,
  onDelete,
  onReorder,
  maxPhotos,
  disabled = false,
  // Reorder drags must win over the surrounding ScrollView — the parent flips
  // its scrollEnabled with these (JOOPI does the same in EditProfileScreen).
  onDragStateChange,
}) {
  const canAdd = !disabled && photos.length < maxPhotos;
  const [gridWidth, setGridWidth] = useState(0);

  const cell = gridWidth > 0 ? gridWidth / COLUMNS : 0;
  const tileSide = cell > 0 ? cell - GAP : 0;

  const data = useMemo(
    () => [
      ...photos.map((photo) => ({ key: photo.id, photo })),
      ...(canAdd
        ? [{ key: 'add', add: true, disabledDrag: true, disabledReSorted: true }]
        : []),
    ],
    [photos, canAdd]
  );

  const renderItem = (item) => {
    if (item.add) {
      return (
        <View style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={[styles.tile, styles.addTile, { width: tileSide, height: tileSide }]}
            accessibilityRole="button"
            accessibilityLabel="Add more listing photos"
          >
            <Feather name="plus" size={24} color={colors.semantic.text.primary} />
          </View>
        </View>
      );
    }
    return (
      <View style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.tile, { width: tileSide, height: tileSide }]}>
          <Image
            source={{ uri: item.photo.previewUri ?? item.photo.uri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            accessibilityLabel="Listing photo. Long press and drag to reorder."
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete listing photo"
            hitSlop={8}
            onPress={() => onDelete(item.photo)}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Feather name="trash" size={16} color={colors.base.white} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View
      onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={`${photos.length} of ${maxPhotos} listing photos added`}
    >
      {cell > 0 && (
        <DraggableGrid
          numColumns={COLUMNS}
          itemHeight={cell}
          data={data}
          renderItem={renderItem}
          onDragStart={() => onDragStateChange?.(true)}
          onDragRelease={(newData) => {
            onDragStateChange?.(false);
            onReorder?.(newData.filter((item) => !item.add).map((item) => item.photo));
          }}
          onItemPress={(item) => {
            if (item.add) onAdd();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.semantic.bg.grey,
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.bg.greyAlpha,
    borderColor: colors.semantic.input.border.normal.color,
    borderWidth: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: colors.base.gray800Alpha,
    borderWidth: 1,
    borderColor: colors.base.gray800Alpha,
  },
  pressed: {
    opacity: 0.7,
  },
});
