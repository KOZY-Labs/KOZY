// Single definition of the denormalized owner/participant display cache built from
// a users doc. Shared by the app (re-exported through lib/listingDraft.js) and by
// scripts/migrate-listing-caches.js via dynamic import — so keep this file plain ESM
// with relative imports only: no '@/' aliases, no React Native dependencies.
// (.mjs so Node can load it directly; Metro resolves the explicit extension.)
import { birthFromDob } from './dob.mjs';

export function ownerFromProfile(profile) {
  if (!profile) return null;
  const birth = birthFromDob(profile.dob);
  return {
    id: profile.uid ?? profile.id ?? null,
    // Public display name: the displayName. firstName/lastName are the LEGAL name
    // (identity verification only) — the fallbacks exist for docs that predate
    // display names (|| so an empty string still falls through).
    name: profile.displayName || profile.firstName || profile.name || '',
    email: profile.email ?? '',
    avatar: profile.avatar ?? [],
    gender: profile.gender ?? '',
    // Never the raw dob — listings are publicly readable. birthYear/birthMonth let
    // readers compute a fresh age at render (no decaying snapshot field).
    birthYear: birth?.year ?? null,
    birthMonth: birth?.month ?? null,
    occupation: profile.occupation ?? '',
    personality: profile.personality ?? [],
    lifestyle: profile.lifestyle ?? [],
    aboutMe: profile.aboutMe ?? '',
    verified: !!profile.verified,
  };
}
