// Trust-level rules — the single definition of profile completeness and the level
// derived from it. Plain ESM with no RN/Expo imports so scripts/migrate-listing-caches.js
// can load it in Node (same pattern as lib/ownerCache.mjs).
//
// Levels (shown in account/trustLevelInfo):
//   1 Member   — signed up (email verified)
//   2 Trusted  — profile complete (photo, basics, personality, lifestyle)
//   3 Verified — Persona identity verification passed

export function getMissingProfileFields(profile) {
  const missing = [];
  if (!(profile?.avatar?.length)) missing.push('Profile photo');
  if (!profile?.firstName?.trim?.()) missing.push('First Name');
  if (!profile?.lastName?.trim?.()) missing.push("Last Name");
  if (!profile?.dob?.trim?.()) missing.push("Date of Birth");
  if (!profile?.gender) missing.push('Gender');
  if (!profile?.occupation) missing.push('Job or Profession');
  if (!(profile?.personality?.length)) missing.push('Personality (pick at least one)');
  if (!(profile?.lifestyle?.length)) missing.push('Lifestyle (pick at least one)');
  return missing;
}

export function isProfileComplete(profile) {
  return getMissingProfileFields(profile).length === 0;
}

export function trustLevelFor(profile) {
  if (profile?.verified) return 3;
  if (isProfileComplete(profile)) return 2;
  return 1;
}
