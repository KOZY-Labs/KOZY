// Google Places API (New) — the only Places API a 2025+ Google Cloud project can
// enable (legacy /maps/api/place/* is refused). Shared by the address inputs
// (post/stepOne, home/search), the education picker (account/editProfile) and the
// typed-address geocoding fallback below.
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

// `query` for react-native-google-places-autocomplete with `isNewPlacesAPI`.
// Everything except `key` is sent as the autocomplete request body.
export const PLACES_QUERY = {
  key: PLACES_KEY,
  languageCode: 'en',
  includedRegionCodes: ['us', 'ca'],
};

// The library keeps the legacy base URL even with `isNewPlacesAPI` — point it at
// the new host or every request 404s silently (list stays empty). It also sends the
// JSON body without a Content-Type (RN XHR default) → Google answers 400, so set it.
export const PLACES_REQUEST_URL = {
  useOnPlatform: 'all',
  url: 'https://places.googleapis.com',
  headers: { 'Content-Type': 'application/json' },
};

// Field masks for `fetchDetails` — only what each flow reads. `id` is mandatory:
// the library treats a new-API details response without `id` as "not found".
export const PLACE_DETAIL_FIELDS = 'id,addressComponents,location,formattedAddress';
export const PLACE_LOCATION_FIELDS = 'id,location';

const component = (components, type, key = 'longText') =>
  components.find((c) => c.types?.includes(type))?.[key] ?? '';

// New-API place details → the listing address fields.
export function addressPartsFromDetails(details) {
  const components = details?.addressComponents ?? [];
  const streetNumber = component(components, 'street_number');
  const route = component(components, 'route');
  return {
    street: [streetNumber, route].filter(Boolean).join(' '),
    city:
      component(components, 'locality') ||
      component(components, 'postal_town') ||
      component(components, 'sublocality') ||
      component(components, 'administrative_area_level_2'),
    province: component(components, 'administrative_area_level_1', 'shortText'),
    postalCode: component(components, 'postal_code'),
    country: component(components, 'country', 'shortText'),
  };
}

export function locationFromDetails(details) {
  const lat = details?.location?.latitude;
  const lng = details?.location?.longitude;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

// Address → coordinates fallback (Text Search, New). Used when a listing address
// was typed instead of picked from the suggestions, so it still lands on the map.
export async function geocodeAddress(address) {
  const query = address?.trim();
  if (!PLACES_KEY || !query) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places:searchText?key=${PLACES_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'places.location' },
      body: JSON.stringify({ textQuery: query, pageSize: 1, languageCode: 'en' }),
    });
    const data = await res.json();
    return locationFromDetails(data?.places?.[0]);
  } catch {
    return null; // network / quota errors — caller falls back to no coordinates
  }
}
