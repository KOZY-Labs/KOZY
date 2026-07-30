// Shared draft state for the multi-step "Add Listing" flow (post/stepOne..Four → preview).
// Mirrors the SignupContext pattern. Each step writes its fields here so the data
// survives navigation and can be published at the end.
//
// The same flow doubles as "Edit Listing": post/edit/[id] loads a saved listing in via
// startEdit(), which sets `editingId` so the preview step updates instead of creating.
import React, { createContext, useContext, useMemo, useState } from 'react';

import { listingToDraft } from '@/lib/listingDraft';

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
  furnishedType: '',
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
  // Set only while editing an existing listing; `returnTo` is the screen to go back to.
  const [editingId, setEditingId] = useState(null);
  const [returnTo, setReturnTo] = useState(null);

  const actions = useMemo(
    () => ({
      setFields: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      setPhotos: (photos) => setDraft((prev) => ({ ...prev, photos })),
      setVideo: (video) => setDraft((prev) => ({ ...prev, video })),
      startEdit: (listing, backTo = null) => {
        setDraft({ ...initialDraft, ...listingToDraft(listing) });
        setEditingId(listing.id);
        setReturnTo(backTo);
      },
      resetDraft: () => {
        setDraft(initialDraft);
        setEditingId(null);
        setReturnTo(null);
      },
    }),
    []
  );

  const value = useMemo(
    () => ({ draft, editingId, returnTo, ...actions }),
    [draft, editingId, returnTo, actions]
  );

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
