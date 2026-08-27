// Shared map/geo helpers for listing maps (search preview + full-screen clustered map).

// NYC fallback used across the app when no listing has coordinates.
const FALLBACK_REGION = {
  latitude: 40.7736,
  longitude: -73.9566,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Coerce to a number, but treat null/undefined/'' as invalid — Number(null) is 0,
// which would silently place coordinate-less listings at (0,0) ("Null Island").
function toCoord(value) {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
}

// True only for a real, finite coordinate value (rejects null/undefined/'').
export function isFiniteCoordinate(value) {
  return Number.isFinite(toCoord(value));
}

// Only listings with real finite lat/lng can be placed on a map.
export function filterWithCoordinates(listings = []) {
  return listings.filter(
    (item) => isFiniteCoordinate(item?.latitude) && isFiniteCoordinate(item?.longitude)
  );
}

// Region that frames every listing, with padding and sane zoom clamps.
// - single listing → minDelta stops an infinitely-zoomed map
// - far-apart listings (e.g. NYC + SF) → fits both, capped at maxDelta
export function boundingRegion(listings = [], { padding = 1.4, minDelta = 0.02, maxDelta = 120 } = {}) {
  const points = filterWithCoordinates(listings);
  if (points.length === 0) return FALLBACK_REGION;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const item of points) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const clamp = (value) => Math.min(Math.max(value, minDelta), maxDelta);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: clamp((maxLat - minLat) * padding),
    longitudeDelta: clamp((maxLng - minLng) * padding),
  };
}

// Approximate slippy-map zoom level from a region's longitudeDelta, clamped to [0, maxZoom].
export function regionToZoom(region, maxZoom = 18) {
  const zoom = Math.round(Math.log2(360 / Math.max(region.longitudeDelta, 1e-8)));
  return Math.max(0, Math.min(maxZoom, zoom));
}

// [west, south, east, north] bbox for supercluster.getClusters.
export function regionToBBox(region) {
  return [
    region.longitude - region.longitudeDelta / 2,
    region.latitude - region.latitudeDelta / 2,
    region.longitude + region.longitudeDelta / 2,
    region.latitude + region.latitudeDelta / 2,
  ];
}
