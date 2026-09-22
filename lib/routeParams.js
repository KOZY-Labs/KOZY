// Helpers for values that travel through expo-router params (always strings, or
// string[] when a key repeats).

// `ids` param → ordered id list. Reel routes receive the list the user was
// browsing (comma-joined) so the reel can page through it.
export function parseIds(param) {
  const raw = Array.isArray(param) ? param[0] : param;
  if (typeof raw !== 'string' || !raw) return [];
  return raw.split(',').filter(Boolean);
}
