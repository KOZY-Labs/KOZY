// Server-side "does the ID match the profile?" check — our substitute for
// Persona's Inquiry Comparison check, which is locked on the Startup plan.
// Pure functions (no Firebase) so the rules are easy to read and test.

// Lower-case, strip accents and apostrophes (O'Brien → obrien), treat hyphens
// as spaces (Jean-Luc → jean luc), drop anything else, collapse whitespace.
function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const tokens = (value) => normalizeName(value).split(' ').filter(Boolean);

// A name matches when every token the user typed appears on the ID (or vice
// versa): profile "Jun" vs ID "Jun Ho" passes, "Jun" vs "Min" fails. Handles
// middle names and the ID carrying the fuller form of the name.
function namesMatch(profileName, idName) {
  const a = tokens(profileName);
  const b = tokens(idName);
  if (!a.length || !b.length) return false;
  const bSet = new Set(b);
  const aSet = new Set(a);
  return a.every((t) => bSet.has(t)) || b.every((t) => aSet.has(t));
}

// Profile DOB is stored as MM/DD/YYYY (see lib/dob.mjs); Persona sends YYYY-MM-DD.
function profileDobToIso(dob) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dob ?? '').trim());
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

// Pull the extracted Government ID attributes out of a Persona webhook body.
// Prefer the government-id verification object in `included`; fall back to the
// inquiry's own fields (the template's "Update Fields" action copies the
// extracted values there). Returns null when nothing usable is present so the
// caller can skip the check rather than fail everyone.
function extractIdentity(body) {
  const payload = body?.data?.attributes?.payload;
  const included = Array.isArray(payload?.included) ? payload.included : [];
  const govId = included.find(
    (item) => item?.type === 'verification/government-id' && item?.attributes
  );
  const fromVerification = govId
    ? {
        firstName: govId.attributes['name-first'],
        lastName: govId.attributes['name-last'],
        birthdate: govId.attributes.birthdate,
      }
    : null;

  const fields = payload?.data?.attributes?.fields ?? {};
  const fieldValue = (key) => fields?.[key]?.value ?? null;
  const fromFields = {
    firstName: fieldValue('name-first'),
    lastName: fieldValue('name-last'),
    birthdate: fieldValue('birthdate'),
  };

  const pick = (key) => fromVerification?.[key] ?? fromFields[key] ?? null;
  const identity = {
    firstName: pick('firstName'),
    lastName: pick('lastName'),
    birthdate: pick('birthdate'),
  };
  return identity.firstName || identity.lastName || identity.birthdate ? identity : null;
}

// Compare the user's saved legal identity with what Persona read off the ID.
// Returns the list of mismatched fields ('name' | 'dob'); empty means match.
// Fields the ID didn't yield are not counted as mismatches.
function findMismatches(profile, identity) {
  const mismatches = [];
  if (identity.firstName || identity.lastName) {
    const firstOk = !identity.firstName || namesMatch(profile?.firstName, identity.firstName);
    const lastOk = !identity.lastName || namesMatch(profile?.lastName, identity.lastName);
    if (!firstOk || !lastOk) mismatches.push('name');
  }
  if (identity.birthdate) {
    const profileIso = profileDobToIso(profile?.dob);
    if (!profileIso || profileIso !== String(identity.birthdate).slice(0, 10)) mismatches.push('dob');
  }
  return mismatches;
}

module.exports = { extractIdentity, findMismatches, namesMatch, profileDobToIso };
