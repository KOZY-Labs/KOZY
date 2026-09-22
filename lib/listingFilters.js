// Shared search-filter predicate — used by the search screen's live preview map
// and by the search results screen, so both always agree.

export function filterListings(listings = [], criteria = {}) {
  const {
    location = '',
    budgetFrom = '',
    budgetTo = '',
    gender = '',
    roomTypes = [],
    lifestyleMatches = [],
    amenities = [],
  } = criteria;

  const loc = String(location).trim().toLowerCase();
  const min = Number(budgetFrom);
  const max = Number(budgetTo);
  const hasMin = String(budgetFrom).trim().length > 0 && Number.isFinite(min);
  const hasMax = String(budgetTo).trim().length > 0 && Number.isFinite(max);

  return listings.filter((item) => {
    const price = Number(item?.price);
    const locationText = `${item?.street ?? ''} ${item?.city ?? ''} ${item?.province ?? ''} ${item?.postalCode ?? ''}`.toLowerCase();
    const lifestyleText = `${(item?.owner?.lifestyle ?? []).join(' ')} ${(item?.owner?.personality ?? []).join(' ')}`.toLowerCase();
    const roomText = `${item?.roomType ?? ''} ${item?.bathroomType ?? ''} ${item?.furnished ? 'Furnished' : 'Unfurnished'} ${(item?.roomDetail ?? []).join(' ')}`.toLowerCase();
    const amenitySet = new Set((item?.roomDetail ?? []).map((a) => String(a).toLowerCase()));

    const matchesLocation = loc.length === 0 || locationText.includes(loc);
    const matchesBudget = (!hasMin || price >= min) && (!hasMax || price <= max);
    const matchesGender = !gender || item?.owner?.gender === gender;
    const matchesRoom =
      roomTypes.length === 0 ||
      roomTypes.some((type) => roomText.includes(String(type).toLowerCase()));
    const matchesLifestyle =
      lifestyleMatches.length === 0 ||
      lifestyleMatches.some((type) => lifestyleText.includes(String(type).toLowerCase()));
    // AND semantics: "Wi-Fi + Parking" means the listing must have both.
    const matchesAmenities =
      amenities.length === 0 || amenities.every((a) => amenitySet.has(String(a).toLowerCase()));

    return matchesLocation && matchesBudget && matchesGender && matchesRoom && matchesLifestyle && matchesAmenities;
  });
}
