// Dark-theme styles for react-native-google-places-autocomplete, shared by the
// address input (post/stepOne) and the education picker (account/editProfile).
import { StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

const styles = StyleSheet.create({
  placesContainer: {
    flex: 1,
    zIndex: 20,
  },
  placesTextInputContainer: {
    flexDirection: 'row',
  },
  placesTextInput: {
    width: '100%',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderColor: colors.semantic.input.border.normal.color,
    borderWidth: colors.semantic.input.border.normal.width,
    backgroundColor: colors.semantic.input.bg,
    color: colors.semantic.input.text,
    fontSize: 12,
    marginBottom: 0,
  },
  placesList: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: colors.semantic.bottomSheet.background,
    borderWidth: 1,
    borderColor: colors.base.gray800,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 30,
  },
  placesRow: {
    backgroundColor: colors.semantic.bottomSheet.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  placesSeparator: {
    height: 1,
    backgroundColor: colors.base.gray800,
  },
  placesDescription: {
    color: colors.semantic.text.primary,
    fontSize: 12,
  },
});

export const placesAutocompleteStyles = {
  container: styles.placesContainer,
  textInputContainer: styles.placesTextInputContainer,
  textInput: styles.placesTextInput,
  listView: styles.placesList,
  row: styles.placesRow,
  separator: styles.placesSeparator,
  description: styles.placesDescription,
  predefinedPlacesDescription: styles.placesDescription,
};
