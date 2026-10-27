// constants/data.js — single home for the app's shared data constants: the listing
// option vocabularies (value ↔ stored label) and the search filter vocabularies.
// Screens and lib code import from here so the pairs can never drift.
//
// The *_LABELS maps are the contract with Firestore: `value` is the form/pill value,
// the label is what gets stored on the listing doc (see lib/listingDraft.js).

// Auth-flow policy: how long the email "Resend" links stay locked after every send
// (signup verification + password reset share it). Environment-independent → a
// constant here, not an env var.
export const RESEND_COOLDOWN_SEC = 60;

// Max photos per chat message (multi-select send). Bubbles render a fixed 3×3 grid.
export const CHAT_MAX_PHOTOS = 9;

// Public display name (users.displayName) length rules — shared by signup + edit profile.
export const DISPLAY_NAME_MIN_LEN = 2;
export const DISPLAY_NAME_MAX_LEN = 20;
// Legal first/last name cap (identity fields) — counter shown in the field.
export const LEGAL_NAME_MAX_LEN = 30;

export const LEASE_LABELS = { 'month-to-month': 'Month-to-Month', 'fixed-term': 'Fixed-term' };
export const ROOM_TYPE_LABELS = { private: 'Private Room', shared: 'Shared Room' };
export const FURNISHED_LABELS = { furnished: 'Furnished', unfurnished: 'Unfurnished' };

// Order = display order in Step 1 and the search filter. Labels are what gets
// stored in listings.roomDetail; renaming one needs scripts/migrate-amenity-labels.js.
export const KEYDETAIL_LABELS = {
  'private-bath': 'Private Bath',
  'laundry-in-unit': 'W/D in Unit',
  'kitchen-access': 'Kitchen Access',
  wifi: 'Wi-Fi',
  'air-conditioning': 'A/C',
  'pet-friendly': 'Pets Allowed',
  laundry: 'Laundry in Building',
  dishwasher: 'Dishwasher',
  elevator: 'Elevator',
  gym: 'Gym',
  'private-outdoor': 'Private Outdoor Space',
  'shared-outdoor': 'Shared Outdoor Space',
  doorman: 'Doorman',
  'swimming-pool': 'Pool',
};

export const LOOKINGFOR_LABELS = {
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

export const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

export const MONTH_LABELS = Object.keys(MONTHS);

// Label -> form value, used to load a saved listing back into the form (edit flow).
function invertLabels(labels) {
  return Object.fromEntries(Object.entries(labels).map(([value, label]) => [label, value]));
}

export const LEASE_VALUES = invertLabels(LEASE_LABELS);
export const ROOM_TYPE_VALUES = invertLabels(ROOM_TYPE_LABELS);
export const KEYDETAIL_VALUES = invertLabels(KEYDETAIL_LABELS);
export const LOOKINGFOR_VALUES = invertLabels(LOOKINGFOR_LABELS);

// A labels map as PillGroup/Dropdown items, preserving map order.
function toOptions(labels) {
  return Object.entries(labels).map(([value, label]) => ({ label, value }));
}

export const LEASE_OPTIONS = toOptions(LEASE_LABELS);
export const ROOMTYPE_OPTIONS = toOptions(ROOM_TYPE_LABELS);
export const FURNISHEDTYPE_OPTIONS = toOptions(FURNISHED_LABELS);
export const KEYDETAIL_OPTIONS = toOptions(KEYDETAIL_LABELS);
export const LOOKINGFOR_OPTIONS = toOptions(LOOKINGFOR_LABELS);
export const MONTH_OPTIONS = MONTH_LABELS.map((m) => ({ label: m, value: m }));
export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const d = String(i + 1);
  return { label: d, value: d };
});
const CURRENT_YEAR = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
  const y = String(CURRENT_YEAR + i);
  return { label: y, value: y };
});
export const UTILITY_OPTIONS = [
  { label: 'Included', value: true },
  { label: 'Not Included', value: false },
];

// Search filter vocabularies. These match against the stored label text on listing docs
// (value === label) and deliberately include options the post form doesn't offer yet.
// Room & House Type filter — only values a listing can actually carry (roomType +
// furnished). Amenities moved to their own filter (SEARCH_AMENITY_OPTIONS) so the
// two vocabularies stay in lock-step with what posters pick in Step 1.
export const SEARCH_ROOM_TYPE_OPTIONS = [
  ...Object.values(ROOM_TYPE_LABELS),
  ...Object.values(FURNISHED_LABELS),
].map((label) => ({ label, value: label }));

// Amenities filter — same labels posters choose in Step 1 (listings.roomDetail),
// matched with AND: every selected amenity must be on the listing.
export const SEARCH_AMENITY_OPTIONS = toOptions(KEYDETAIL_LABELS).map(({ label }) => ({ label, value: label }));

// Profile vocabularies — shared between Edit Profile (what users pick) and the
// search filters (what listings are matched against), so the two can never drift.
export const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary'].map((label) => ({
  label,
  value: label,
}));

export const PERSONALITY_OPTIONS = [
  'Friendly',
  'Independent',
  'Calm',
  'Respectful',
  'Introverted',
  'Extroverted',
].map((label) => ({ label, value: label }));

export const SEARCH_LIFESTYLE_OPTIONS = [
  'Early Bird',
  'Night Owl',
  'Homebody',
  'Out & About',
  'Clean & Tidy',
  'Easygoing',
  'Smoker',
  'Non-Smoker',
  'Work from Home',
  'Go to Office',
].map((label) => ({ label, value: label }));

// Optional "more about me" profile fields. Languages are alphabetical with Other
// last — picking Other reveals a free-text box whose value is stored instead.
// Stored value = plain name; the flag lives only in the label (a representative
// country per language — colour-emoji flags render on iOS and Android alike).
export const LANGUAGE_OTHER = 'Other';
const LANGUAGE_FLAGS = {
  Arabic: '🇸🇦', Cantonese: '🇭🇰', English: '🇺🇸', French: '🇫🇷', German: '🇩🇪', Hindi: '🇮🇳',
  Italian: '🇮🇹', Japanese: '🇯🇵', Korean: '🇰🇷', Mandarin: '🇨🇳', Persian: '🇮🇷', Polish: '🇵🇱',
  Portuguese: '🇧🇷', Punjabi: '🇮🇳', Russian: '🇷🇺', Spanish: '🇪🇸', Tagalog: '🇵🇭', Urdu: '🇵🇰',
  Vietnamese: '🇻🇳', [LANGUAGE_OTHER]: '🌐',
};
export const LANGUAGE_OPTIONS = Object.keys(LANGUAGE_FLAGS).map((value) => ({
  value,
  label: `${LANGUAGE_FLAGS[value]} ${value}`,
}));
// Display label for a stored language (custom "Other" entries have no flag).
export const languageLabel = (value) =>
  LANGUAGE_FLAGS[value] ? `${LANGUAGE_FLAGS[value]} ${value}` : value;
// Alphabetical by list position; custom entries after the known ones, A→Z.
export function sortLanguages(values = []) {
  const order = Object.keys(LANGUAGE_FLAGS);
  const rank = (v) => (order.includes(v) ? order.indexOf(v) : order.length);
  return [...values].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
export const PROFILE_SHORT_TEXT_MAX_LEN = 50; // pet / hobby / important-to-me

// Report reasons (reports.reasonCode). `only` restricts a reason to one target type.
export const REPORT_REASONS = [
  { value: 'scam', label: 'Scam or misleading information' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Discrimination or harassment' },
  { value: 'unavailable', label: 'Duplicate or no longer available', only: 'listing' },
  { value: 'other', label: 'Other' },
];
