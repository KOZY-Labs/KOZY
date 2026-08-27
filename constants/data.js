// constants/data.js — single home for the app's shared data constants: the listing
// option vocabularies (value ↔ stored label) and the search filter vocabularies.
// Screens and lib code import from here so the pairs can never drift.
//
// The *_LABELS maps are the contract with Firestore: `value` is the form/pill value,
// the label is what gets stored on the listing doc (see lib/listingDraft.js).

export const LEASE_LABELS = { 'month-to-month': 'Month-to-Month', 'fixed-term': 'Fixed-term' };
export const ROOM_TYPE_LABELS = { private: 'Private Room', shared: 'Shared Room' };
export const FURNISHED_LABELS = { furnished: 'Furnished', unfurnished: 'Unfurnished' };

export const KEYDETAIL_LABELS = {
  wifi: 'Wi-Fi',
  laundry: 'Laundry in building',
  'kitchen-access': 'Kitchen access',
  'pet-friendly': 'Pet friendly',
  parking: 'Parking',
  'shared-bathroom': 'Shared Bathroom',
  gym: 'Gym',
  'swimming-pool': 'Swimming Pool',
  sauna: 'Sauna',
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
export const SEARCH_ROOM_TYPE_OPTIONS = [
  'Private Room',
  'Shared room',
  'Master bedroom',
  'Furnished',
  'Unfurnished',
  'Shared bathroom',
  'Ensuite bathroom',
  'Kitchen access',
  'Laundry in building',
  'Laundry in unit',
].map((label) => ({ label, value: label }));

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
