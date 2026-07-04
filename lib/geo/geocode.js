// Address → coordinates fallback using the Places API "Find Place From Text" endpoint
// (works with the existing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY; the separate Geocoding API
// is not enabled on that key). Used when a listing address was typed manually instead of
// being picked from the autocomplete suggestions, so listings still land on the map.
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function geocodeAddress(address) {
  const query = address?.trim();
  if (!PLACES_KEY || !query) return null;

  try {
    const url =
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json' +
      `?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry&key=${PLACES_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const location = data?.candidates?.[0]?.geometry?.location;
    if (data?.status === 'OK' && location) {
      return { latitude: location.lat, longitude: location.lng };
    }
  } catch {
    // network / quota errors — caller falls back to no coordinates
  }
  return null;
}
