// Single home for the date-of-birth contract: the string format is 'MM/DD/YYYY',
// produced at signup and edited in Edit Profile (until identity is verified).

// Progressive input mask: digits → 'MM/DD/YYYY'.
export function formatDob(text) {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function parseDob(dob) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob ?? '');
  if (!match) return null;
  const [, month, day, year] = match.map(Number);
  // Reject impossible dates ('25/12/1998', '02/31/2000') via Date round-trip.
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  // A birthdate can't be in the future.
  if (date.getTime() > Date.now()) return null;
  return { month, day, year };
}

export function isValidDob(dob) {
  return parseDob(dob) !== null;
}

// Birth year/month only (never the day) — the denormalized owner cache stores these
// so readers can compute a FRESH age at render time instead of a decaying snapshot,
// while still not exposing the exact birthdate on publicly readable listings.
export function birthFromDob(dob) {
  const parsed = parseDob(dob);
  return parsed ? { year: parsed.year, month: parsed.month } : null;
}

// Single core age rule (birthday decrement + plausibility clamp). `day` optional:
// without it the birthday is assumed at the start of the month.
export function ageFromBirth(year, month, day) {
  if (!Number.isInteger(year)) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  if (Number.isInteger(month)) {
    const hadBirthday =
      today.getMonth() + 1 > month ||
      (today.getMonth() + 1 === month && (!Number.isInteger(day) || today.getDate() >= day));
    if (!hadBirthday) age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

// Age in years from a dob string, or null when missing/unparsable/implausible.
export function ageFromDob(dob) {
  const parsed = parseDob(dob);
  if (!parsed) return null;
  return ageFromBirth(parsed.year, parsed.month, parsed.day);
}

// KOZY is 18+: chatting/posting with strangers about housing requires adult users.
export const MIN_AGE = 18;

export function meetsMinimumAge(dob) {
  const age = ageFromDob(dob);
  return age != null && age >= MIN_AGE;
}
