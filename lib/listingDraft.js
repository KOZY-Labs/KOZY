// Normalizes the ListingDraft (raw form values) into the `listings` schema shape.
// The value ↔ stored-label vocabularies live in constants/data.js, shared with the
// option lists in post/stepOne.jsx so the two can never drift.
// The denormalized owner cache lives in lib/ownerCache.mjs (single definition also
// used by scripts/migrate-listing-caches.js); re-exported here for app callers.
import { ownerFromProfile } from '@/lib/ownerCache.mjs';
import {
  LEASE_LABELS,
  LEASE_VALUES,
  ROOM_TYPE_LABELS,
  ROOM_TYPE_VALUES,
  KEYDETAIL_LABELS,
  KEYDETAIL_VALUES,
  LOOKINGFOR_LABELS,
  LOOKINGFOR_VALUES,
  MONTHS,
  MONTH_LABELS,
} from '@/constants/data';

export { ownerFromProfile };

function toAvailableFrom(d) {
  if (!d.availableMonth || !d.availableDay || !d.availableYear) return '';
  const mm = MONTHS[d.availableMonth] ?? '01';
  const dd = String(d.availableDay).padStart(2, '0');
  return `${d.availableYear}-${mm}-${dd}`;
}

// 'YYYY-MM-DD' -> the month/day/year dropdown values used by stepOne.
function fromAvailableFrom(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return { availableMonth: null, availableDay: null, availableYear: null };
  const [, year, month, day] = match;
  return {
    availableMonth: MONTH_LABELS[Number(month) - 1] ?? null,
    availableDay: String(Number(day)),
    availableYear: year,
  };
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Map the raw draft to listing fields (no media, no owner — those are added by the caller).
export function normalizeDraft(draft) {
  const keyDetail = draft.keyDetail ?? [];
  const roomDetail = keyDetail.map((v) => KEYDETAIL_LABELS[v] ?? v);

  return {
    title: draft.roomTitle ?? '',
    description: draft.description?.trim?.() ?? '',
    price: toNumber(draft.price),
    deposit: draft.deposit === 'TBD' ? 'TBD' : toNumber(draft.deposit),
    street: draft.street ?? '',
    additionalAddress: draft.additionalAddress ?? '',
    city: draft.city ?? '',
    province: draft.province ?? '',
    postalCode: draft.postalCode ?? '',
    latitude: draft.latitude != null ? toNumber(draft.latitude, null) : null,
    longitude: draft.longitude != null ? toNumber(draft.longitude, null) : null,
    availableFrom: toAvailableFrom(draft),
    leaseType: LEASE_LABELS[draft.leaseType] ?? draft.leaseType ?? '',
    minimumStay: toNumber(draft.minimumStay),
    listingType: 'Room',
    roomType: ROOM_TYPE_LABELS[draft.roomType] ?? draft.roomType ?? '',
    bathroomType: keyDetail.includes('shared-bathroom') ? 'Shared' : 'Private',
    // Not collected in the current form — sensible defaults until the form adds them.
    // The edit flow carries the saved values through the draft so they aren't wiped.
    bedrooms: draft.bedrooms != null ? toNumber(draft.bedrooms, 1) : 1,
    bathrooms: draft.bathrooms != null ? toNumber(draft.bathrooms, 1) : 1,
    sizeSqft: draft.sizeSqft != null ? toNumber(draft.sizeSqft, 0) : 0,
    furnished: draft.furnishedType === 'furnished',
    utilityIncluded: !!draft.isUtilityIncluded,
    roomDetail,
    lookingFor: (draft.lookingFor ?? []).map((v) => LOOKINGFOR_LABELS[v] ?? v),
  };
}

// Inverse of normalizeDraft: turn a saved listing doc back into raw form values so the
// multi-step flow can edit it. Already-uploaded media keeps `remoteUrl` so the publish
// step reuses it instead of re-uploading (see lib/utils/uploadMedia.js).
// NOTE: stored docs are expected to be in the CURRENT schema — legacy shapes (old
// amenity labels, bathroomType without the shared-bathroom amenity) are healed once
// by scripts/migrate-listing-caches.js, not by readers. Run it before testing edits.
export function listingToDraft(listing) {
  return {
    roomTitle: listing.title ?? '',
    description: listing.description ?? '',
    price: listing.price != null ? String(listing.price) : '',
    street: listing.street ?? '',
    additionalAddress: listing.additionalAddress ?? '',
    city: listing.city ?? '',
    province: listing.province ?? '',
    postalCode: listing.postalCode ?? '',
    latitude: listing.latitude ?? null,
    longitude: listing.longitude ?? null,
    leaseType: LEASE_VALUES[listing.leaseType] ?? '',
    deposit: listing.deposit === 'TBD' ? 'TBD' : listing.deposit != null ? String(listing.deposit) : '',
    roomType: ROOM_TYPE_VALUES[listing.roomType] ?? '',
    furnishedType: listing.furnished ? 'furnished' : 'unfurnished',
    keyDetail: (listing.roomDetail ?? []).map((label) => KEYDETAIL_VALUES[label] ?? label),
    lookingFor: (listing.lookingFor ?? []).map((label) => LOOKINGFOR_VALUES[label] ?? label),
    ...fromAvailableFrom(listing.availableFrom),
    minimumStay: listing.minimumStay != null ? String(listing.minimumStay) : '',
    isUtilityIncluded: !!listing.utilityIncluded,
    // Carried through untouched — the form doesn't collect these yet.
    bedrooms: listing.bedrooms ?? null,
    bathrooms: listing.bathrooms ?? null,
    sizeSqft: listing.sizeSqft ?? null,
    photos: (listing.images ?? []).map((url, index) => ({
      id: `existing-${index}`,
      uri: url,
      previewUri: url,
      remoteUrl: url,
      uploadStatus: 'uploaded',
    })),
    video: listing.videoUrl ? { uri: listing.videoUrl, remoteUrl: listing.videoUrl } : null,
  };
}

// Build a display object for preview/step screens using LOCAL media uris (not yet uploaded).
export function draftToPreview(draft, profile) {
  return {
    id: 'preview',
    ...normalizeDraft(draft),
    owner: ownerFromProfile(profile) ?? { id: null, name: '', avatar: [] },
    images: (draft.photos ?? []).map((p) => p.previewUri ?? p.uri),
    videoUrl: draft.video?.uri ?? null,
  };
}
