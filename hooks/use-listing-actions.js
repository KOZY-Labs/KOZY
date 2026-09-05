import { useCallback, useEffect, useRef, useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { showAuthGate } from '@/lib/authGate';
import { listingShareUrl } from '@/lib/links';
import { subscribeSavedListingIds, toggleSavedListing } from '@/lib/db/savedListings';

// Shared save/share/report behavior for listing screens (feed, reels, details).
// Saves live in users/{uid}/savedListings — the subscription applies local writes
// instantly, so the heart needs no optimistic state of its own.
export function useListingActions(item, { reportBackTo } = {}) {
  const { isLoggedIn, uid } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  // Latest item in a ref so callbacks keep a stable identity across refetches.
  const itemRef = useRef(item);
  itemRef.current = item;

  const itemId = item?.id;
  useEffect(() => {
    if (!uid || !itemId) {
      setIsSaved(false); // logged out, or don't carry the previous item's state
      return undefined;
    }
    return subscribeSavedListingIds(uid, (ids) => setIsSaved(ids.includes(itemId)));
  }, [uid, itemId]);

  // Resolves to whether the listing is saved AFTER the toggle (undefined when gated
  // or when there is nothing to toggle).
  const onToggleSave = useCallback(async () => {
    if (!isLoggedIn) {
      showAuthGate({
        title: 'Save it for later',
        message: 'Sign Up or Log In to keep track of places you like.',
      });
      return undefined;
    }
    const id = itemRef.current?.id;
    if (!uid || !id) return undefined;
    try {
      return await toggleSavedListing(uid, id);
    } catch {
      return undefined;
    }
  }, [isLoggedIn, uid]);

  const onShare = useCallback(async () => {
    const current = itemRef.current;
    if (!current?.id) return;
    const url = listingShareUrl(current.id);
    try {
      await Share.share({
        // Android's share sheet only forwards `message`, so the URL must live
        // there; iOS additionally uses `url` for rich previews.
        message: `${current.title ?? 'A room on KOZY'} — ${url}`,
        url,
        title: current.title ?? 'KOZY listing',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, []);

  const onReport = useCallback(() => {
    if (!isLoggedIn) {
      showAuthGate({
        title: 'Report this listing',
        message: 'Sign Up or Log In to report listings.',
      });
      return;
    }
    router.push({
      pathname: '/(tabs)/account/contactUs',
      params: { backTo: reportBackTo, listingId: itemRef.current?.id },
    });
  }, [isLoggedIn, reportBackTo]);

  return { isSaved, onToggleSave, onShare, onReport };
}
