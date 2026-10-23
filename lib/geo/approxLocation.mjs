// Airbnb-style "general location": the public listing doc carries only a point
// offset from the real address by a FIXED, listing-specific distance/direction,
// and the UI draws a circle around it. The real address stays inside the circle
// but never at its centre, and because the offset is derived from the listing id
// it never moves — re-publishing or reloading can't be used to triangulate.
//
// .mjs so the migration script (node, CommonJS) can `import()` the same math the
// app uses — the two must agree or old and new listings would drift apart.

export const APPROX_RADIUS_M = 500; // circle drawn on the detail map
const MIN_OFFSET_M = 150;
const MAX_OFFSET_M = 350; // < APPROX_RADIUS_M so the address is always inside

// Tiny deterministic string hash (FNV-1a, 32-bit). Not cryptographic — it only
// needs to be stable and spread evenly.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// (lat, lng, seed) → { latitude, longitude } shifted MIN..MAX metres in a direction
// chosen by the seed. Returns null when the input isn't a usable coordinate.
export function approximateCoordinate(latitude, longitude, seed) {
  // Number(null) is 0 ("Null Island") — reject empty values explicitly.
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const h = hash(String(seed));
  const angle = ((h & 0xffff) / 0x10000) * 2 * Math.PI;
  const distance = MIN_OFFSET_M + ((h >>> 16) / 0x10000) * (MAX_OFFSET_M - MIN_OFFSET_M);

  const dLat = (distance * Math.cos(angle)) / 111_320;
  const dLng = (distance * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { latitude: lat + dLat, longitude: lng + dLng };
}
