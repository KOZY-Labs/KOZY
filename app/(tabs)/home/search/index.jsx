import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import AppDrawer from '@/components/ui/drawer/AppDrawer';
import AppText from '@/components/ui/appText';
import DisplayInput from '@/components/ui/input/displayInput';
import PillGroup from '@/components/ui/pill/pillGroup';
import TextField from '@/components/ui/input/textField';
import Dropdown from '@/components/ui/input/dropdown';
import FormField from '@/components/ui/form/formField';
import ListingsAreaSheet from '@/components/ui/drawer/ListingsAreaSheet';
import ListingsClusterMap from '@/components/ui/listingsClusterMap';
import { colors } from '@/constants/colors';
import { useBrowseListings } from '@/hooks/use-listings';
import { filterWithCoordinates } from '@/lib/geo/mapRegion';
import { filterListings } from '@/lib/listingFilters';
import { SEARCH_ROOM_TYPE_OPTIONS, SEARCH_LIFESTYLE_OPTIONS, GENDER_OPTIONS } from '@/constants/data';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const genderDrawerRef = useRef(null);
  const roomTypeDrawerRef = useRef(null);
  const lifestyleDrawerRef = useRef(null);
  const areaSheetRef = useRef(null);

  // Listings behind the last-tapped map marker (single pin or grouped cluster).
  const [areaListings, setAreaListings] = useState([]);

  const [location, setLocation] = useState('');
  // Set when an autocomplete suggestion is picked: { mainText, latitude, longitude }.
  // The input shows the full address; filtering uses mainText (street) so it can match
  // listing addresses; the preview map recenters on the coordinates.
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [budgetFrom, setBudgetFrom] = useState('');
  const [budgetTo, setBudgetTo] = useState('');
  const [gender, setGender] = useState(''); // '' = open to any (no gender filter)
  const [roomTypes, setRoomTypes] = useState([]);
  const [lifestyleMatches, setLifestyleMatches] = useState([]);

  const { data: listings } = useBrowseListings();

  const locationQuery = selectedPlace?.mainText ?? location;

  // Live-filtered pins: the preview map reflects the current filters in real time.
  const mapListings = useMemo(
    () =>
      filterListings(filterWithCoordinates(listings), {
        location: locationQuery,
        budgetFrom,
        budgetTo,
        gender,
        roomTypes,
        lifestyleMatches,
      }),
    [listings, locationQuery, budgetFrom, budgetTo, gender, roomTypes, lifestyleMatches]
  );

  // Latest preview-map position — handed off to the full-screen map so it opens in place.
  const lastRegionRef = useRef(null);

  const filterParams = () => ({
    location: locationQuery,
    budgetFrom,
    budgetTo,
    gender,
    roomTypes: JSON.stringify(roomTypes),
    lifestyleMatches: JSON.stringify(lifestyleMatches),
  });

  // Marker taps preview the area's listings in a sheet; opening a listing from there
  // pushes the reel — back pops the stack and returns here with state intact.
  // A single listing skips the sheet and opens directly.
  const handleOpenArea = (items) => {
    if (items.length === 0) return;
    if (items.length === 1) {
      handleOpenListing(items[0]);
      return;
    }
    setAreaListings(items);
    areaSheetRef.current?.snapToIndex(0);
  };

  const handleOpenListing = (listing) => {
    areaSheetRef.current?.close();
    router.push({
      pathname: '/home/search/[id]',
      params: { id: listing.id },
    });
  };

  const handleOpenFullMap = () => {
    const r = lastRegionRef.current;
    router.push({
      pathname: '/home/search/map',
      params: {
        ...filterParams(),
        ...(r
          ? {
              centerLat: String(r.latitude),
              centerLng: String(r.longitude),
              latDelta: String(r.latitudeDelta),
              lngDelta: String(r.longitudeDelta),
            }
          : {}),
      },
    });
  };

  // Recenter the preview when an address is picked from the autocomplete.
  const previewCenter = useMemo(() => {
    if (selectedPlace?.latitude != null && selectedPlace?.longitude != null) {
      return {
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
    }
    return null;
  }, [selectedPlace]);

  return (
    <>
      <View style={styles.screen}>
        {/* Single-item FlatList container (not ScrollView) so the autocomplete's inner
            VirtualizedList doesn't warn about nesting — same pattern as post/stepOne. */}
        <FlatList
          data={[{ key: 'content' }]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={() => (
            <>
          <View style={styles.heroBlock}>
            <SearchSection label="Location">
              <View style={styles.locationInput}>
                <GooglePlacesAutocomplete
                  placeholder="1423 3rd Ave"
                  fetchDetails
                  debounce={300}
                  minLength={2}
                  enablePoweredByContainer={false}
                  keyboardShouldPersistTaps="always"
                  listViewDisplayed="auto"
                  query={{
                    key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
                    language: 'en',
                    components: 'country:ca|country:us',
                  }}
                  textInputProps={{
                    value: location,
                    placeholderTextColor: colors.semantic.input.textDisabled,
                    onChangeText: (text) => {
                      setLocation(text);
                      setSelectedPlace(null);
                    },
                    returnKeyType: 'search',
                    accessibilityLabel: 'Location',
                  }}
                  onPress={(data, details = null) => {
                    // Show the full address; filter by the street part; recenter the map.
                    const loc = details?.geometry?.location;
                    setLocation(data?.description ?? '');
                    setSelectedPlace({
                      mainText: data?.structured_formatting?.main_text ?? data?.description ?? '',
                      latitude: loc?.lat ?? null,
                      longitude: loc?.lng ?? null,
                    });
                  }}
                  styles={{
                    container: styles.placesContainer,
                    textInputContainer: styles.placesTextInputContainer,
                    textInput: styles.locationText,
                    listView: styles.placesList,
                    row: styles.placesRow,
                    separator: styles.placesSeparator,
                    description: styles.placesDescription,
                  }}
                />
                <Feather name="search" color={colors.semantic.text.primary} size={28} style={{ marginTop: 5 }} />
              </View>
            </SearchSection>

            {/* Interactive clustered preview — pan/zoom/pills work in place */}
            <View style={styles.mapContainer}>
              <ListingsClusterMap
                listings={mapListings}
                style={StyleSheet.absoluteFill}
                centerRegion={previewCenter}
                onPressListing={(listing) => handleOpenArea([listing])}
                onPressCluster={handleOpenArea}
                onRegionChange={(region) => {
                  lastRegionRef.current = region;
                }}
                showZoomControls
                zoomControlsOffset={52}
              />
              <Pressable
                style={styles.mapHint}
                accessibilityRole="button"
                accessibilityLabel="Open full map of listings"
                onPress={handleOpenFullMap}
              >
                <Feather name="map" size={14} color={colors.base.white} />
                <AppText variant="body-xsm" style={styles.mapHintText}>
                  Open map
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.filters}>
            <SearchSection label="Rent Budget">
              <View style={styles.budgetRow}>
                <TextField
                  placeholder="MIN"
                  value={budgetFrom}
                  onChangeText={setBudgetFrom}
                  keyboardType="numeric"
                  containerStyle={styles.budgetInput}
                />
                <TextField
                  placeholder="MAX"
                  value={budgetTo}
                  onChangeText={setBudgetTo}
                  keyboardType="numeric"
                  containerStyle={styles.budgetInput}
                />
              </View>
            </SearchSection>
            <FormField label="Gender Preference">
              <DisplayInput
                value={gender}
                placeholder="Open to any"
                onPress={() => genderDrawerRef.current?.snapToIndex(0)}
                rightIcon={<Feather name="chevron-down" size={22} color={colors.semantic.text.primary} />}
                accessibilityLabel="Gender Preference filter"
              />
            </FormField>
            <FormField label="Room & House Type">
              <DisplayInput
                value={roomTypes}
                onPress={() => roomTypeDrawerRef.current?.snapToIndex(0)}
                isMulti
              />
            </FormField>
            <FormField label="Lifestyle Match">
              <DisplayInput
                value={lifestyleMatches}
                onPress={() => lifestyleDrawerRef.current?.snapToIndex(0)}
                isMulti
              />
            </FormField>
          </View>
            </>
          )}
        />

        <AppDrawer
          ref={genderDrawerRef}
          primaryAction={() => genderDrawerRef.current?.close()}
          primaryActionText="Save"
          // Wheel drawer: the sheet must not scroll or it steals the wheel's drag.
          scrollable={false}
        >
          <Dropdown
            value={gender}
            onChange={setGender}
            options={[{ label: 'Open to any', value: '' }, ...GENDER_OPTIONS]}
          />
        </AppDrawer>

        <AppDrawer
          ref={roomTypeDrawerRef}
          title="Room & House Type"
          description={'Find the type of room and home you prefer\nSelect all that apply'}
          primaryAction={() => roomTypeDrawerRef.current?.close()}
          primaryActionText="Save"
        >
          <PillGroup 
            items={SEARCH_ROOM_TYPE_OPTIONS}
            value={roomTypes} 
            onChange={setRoomTypes} 
          />
        </AppDrawer>

        <AppDrawer
          ref={lifestyleDrawerRef}
          primaryAction={() => lifestyleDrawerRef.current?.close()}
          primaryActionText="Save"
          title="Lifestyle Match"
          description={'Find homes that match your lifestyle\nSelect all that apply'}
        >
          <PillGroup
            items={SEARCH_LIFESTYLE_OPTIONS}
            value={lifestyleMatches}
            onChange={setLifestyleMatches}
          />
        </AppDrawer>

        <ListingsAreaSheet
          ref={areaSheetRef}
          listings={areaListings}
          onPressListing={handleOpenListing}
          onClose={() => setAreaListings([])}
        />
      </View>
    </>
  );
}

function SearchSection({ label, children }) {
  return (
    <View style={styles.section}>
      <AppText variant="body-md-strong" color="primary">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.base.background,
  },
  content: {
    paddingHorizontal: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    marginLeft: -8,
    marginBottom: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroBlock: {
    gap: 13,
  },
  section: {
    width: '100%',
    gap: 4,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    zIndex: 20,
    elevation: 20,
  },
  locationText: {
    flex: 1,
    height: 38,
    color: colors.semantic.input.text,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 4,
    fontFamily: 'OpenSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 0,
  },
  placesContainer: {
    flex: 1,
    zIndex: 20,
  },
  placesTextInputContainer: {
    flexDirection: 'row',
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: colors.semantic.input.border.normal.color,
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
  mapContainer: {
    height: 320,
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.base.gray500,
  },
  mapHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  mapHintText: {
    color: colors.base.white,
  },
  filters: {
    marginTop: 25,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  budgetInput: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: colors.base.background,
  },
  genderDrawer: {
    gap: 20,
    paddingTop: 28,
  },
  genderOption: {
    width: '100%',
    height: 29,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: colors.base.gray800Alpha,
    borderWidth: 1,
    borderColor: colors.base.gray800Alpha,
  },
  genderOptionText: {
    textAlign: 'center',
  },
  filterDrawer: {
    gap: 50,
    paddingTop: 8,
  },
  drawerHeader: {
    gap: 10,
  },
  drawerDescription: {
    lineHeight: 17,
  },
});
