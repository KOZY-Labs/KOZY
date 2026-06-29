// Shared draft state for the multi-step "Add Listing" flow (post/stepOne..Four → preview).
// Mirrors the SignupContext pattern. Each step writes its fields here so the data
// survives navigation and can be published at the end.
import React, { createContext, useContext, useMemo, useState } from 'react';

const ListingDraftContext = createContext(null);

const initialDraft = {
  // stepOne — room details
  roomTitle: '',
  price: '',
  street: '',
  additionalAddress: '',
  city: '',
  province: '',
  postalCode: '',
  latitude: null,
  longitude: null,
  leaseType: '',
  deposit: '',
  roomType: '',
  bathroomType: '',
  keyDetail: [],
  lookingFor: [],
  availableMonth: null,
  availableDay: null,
  availableYear: null,
  minimumStay: '',
  isUtilityIncluded: true,
  // stepTwo — photos (expo-image-picker assets)
  photos: [],
  // stepThree — video (expo-image-picker asset)
  video: null,
};

export function ListingDraftProvider({ children }) {
  const [draft, setDraft] = useState(initialDraft);

  const actions = useMemo(
    () => ({
      setFields: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      setPhotos: (photos) => setDraft((prev) => ({ ...prev, photos })),
      setVideo: (video) => setDraft((prev) => ({ ...prev, video })),
      resetDraft: () => setDraft(initialDraft),
    }),
    []
  );

  const value = useMemo(() => ({ draft, ...actions }), [draft, actions]);

  return (
    <ListingDraftContext.Provider value={value}>
      {children}
    </ListingDraftContext.Provider>
  );
}

export function useListingDraft() {
  const ctx = useContext(ListingDraftContext);
  if (!ctx) throw new Error('useListingDraft must be used within ListingDraftProvider');
  return ctx;
}
