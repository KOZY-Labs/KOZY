import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

export default function AddedPhotoGrid({
  photos,
  onAdd,
  onDelete,
  maxPhotos,
  disabled = false,
}) {
  const canAdd = !disabled && photos.length < maxPhotos;

  return (
    <View
      style={styles.grid}
      accessibilityLabel={`${photos.length} of ${maxPhotos} listing photos added`}
    >
      {photos.map((photo, index) => (
        <View key={photo.id} style={styles.tile}>
          <Image
            source={{ uri: photo.previewUri ?? photo.uri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            accessibilityLabel={`Listing photo ${index + 1}`}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete listing photo ${index + 1}`}
            hitSlop={8}
            onPress={() => onDelete(photo)}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="trash" size={16} color={colors.base.white} />
          </Pressable>
        </View>
      ))}

      {canAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add more listing photos"
          onPress={onAdd}
          style={({ pressed }) => [
            styles.tile,
            styles.addTile,
            pressed && styles.pressed,
          ]}
        >
          <Feather name="plus" size={24} color={colors.semantic.text.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    gap: 6,
  },
  tile: {
    width: '31.9%',
    aspectRatio: 1,
    flexGrow: 0,
    flexShrink: 0,
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
