// Normalizes the ListingDraft (raw form values) into the `listings` schema shape,
// and builds the denormalized owner cache from the author's profile.
// Keep the value maps here in sync with the option lists in post/stepOne.jsx.

const LEASE_LABELS = { 'month-to-month': 'Month-to-Month', 'fixed-term': 'Fixed-term' };
const ROOM_TYPE_LABELS = { private: 'Private Room', shared: 'Shared Room' };
const BATHROOM_LABELS = { 'private-room': 'Private', 'shared-room': 'Shared' };

const KEYDETAIL_LABELS = {
  wifi: 'Wi-Fi',
  laundry: 'Laundry',
  furnished: 'Furnished',
  unfurnished: 'Unfurnished',
  'kitchen-access': 'Kitchen access',
  'pet-friendly': 'Pet friendly',
};

const LOOKINGFOR_LABELS = {
  man: 'Man',
  woman: 'Woman',
  'non-binary': 'Non-binary',
  'open-to-any': 'Open to any',
  clean: 'Clean',
  responsible: 'Responsible',
  'pet-friendly': 'Pet-friendly',
  'quiet-at-night': 'Quiet at night',
  'early-schedule': 'Early schedule',
  'non-smoker': 'Non-smoker',
};

const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function toAvailableFrom(d) {
  if (!d.availableMonth || !d.availableDay || !d.availableYear) return '';
  const mm = MONTHS[d.availableMonth] ?? '01';
  const dd = String(d.availableDay).padStart(2, '0');
  return `${d.availableYear}-${mm}-${dd}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Owner display cache (denormalized onto each listing) from the author's user profile.
export function ownerFromProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.uid ?? profile.id ?? null,
    // Public display name: nickname first (defaults to firstName at signup).
    name:
      profile.nickname ??
      profile.name ??
      `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
    email: profile.email ?? '',
    avatar: profile.avatar ?? [],
    gender: profile.gender ?? '',
    ageGroup: profile.ageGroup ?? '',
    occupation: profile.occupation ?? '',
    personality: profile.personality ?? [],
    lifestyle: profile.lifestyle ?? [],
    aboutMe: profile.aboutMe ?? '',
    verified: !!profile.verified,
  };
}

// Map the raw draft to listing fields (no media, no owner — those are added by the caller).
export function normalizeDraft(draft) {
  const keyDetail = draft.keyDetail ?? [];
  const roomDetail = keyDetail
    .filter((v) => v !== 'furnished' && v !== 'unfurnished')
    .map((v) => KEYDETAIL_LABELS[v] ?? v);

  return {
    title: draft.roomTitle ?? '',
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
    bathroomType: BATHROOM_LABELS[draft.bathroomType] ?? draft.bathroomType ?? '',
    // Not collected in the current form — sensible defaults until the form adds them.
    bedrooms: 1,
    bathrooms: 1,
    sizeSqft: 0,
    furnished: keyDetail.includes('furnished'),
    utilityIncluded: !!draft.isUtilityIncluded,
    roomDetail,
    lookingFor: (draft.lookingFor ?? []).map((v) => LOOKINGFOR_LABELS[v] ?? v),
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
