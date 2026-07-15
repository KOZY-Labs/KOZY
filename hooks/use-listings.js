// Data hooks for listings — centralize fetch + loading/empty/error so screens stay clean.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { listListings, getListing, subscribeMyListings } from '@/lib/db/listings';
import { useChats } from '@/hooks/use-chats';
import { useAuth } from '@/context/AuthContext';

// Browse/feed listings. `options` is passed to listListings (e.g. { max, status }).
export function useListings(options) {
  const key = JSON.stringify(options ?? {});
  const [state, setState] = useState({ data: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await listListings(options ?? {});
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: [], loading: false, error });
    }
    // options is captured via the serialized `key` to avoid identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

// Browse-facing listings (home feed, search, maps): published listings minus the
// viewer's own and minus ones they already have a chat/request with (those come back
// if the chat is deleted). Logged-out viewers see everything.
export function useBrowseListings(options) {
  const { uid } = useAuth();
  const base = useListings(options);
  const { data: chats } = useChats(uid);

  const data = useMemo(() => {
    const chattedListingIds = new Set(chats.map((c) => c.listingId));
    return base.data.filter((l) => l.ownerId !== uid && !chattedListingIds.has(l.id));
  }, [base.data, chats, uid]);

  return { ...base, data };
}

// A single listing by id.
export function useListing(id) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getListing(id);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

// Listings owned by a user (all statuses), for My Listings. Realtime so a freshly
// published listing appears as soon as its serverTimestamp resolves.
export function useMyListings(ownerId) {
  const [state, setState] = useState({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!ownerId) {
      setState({ data: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    const unsubscribe = subscribeMyListings(
      ownerId,
      (data) => setState({ data, loading: false, error: null })
    );
    return unsubscribe;
  }, [ownerId]);

  // reload kept for API compatibility; realtime listener already keeps data fresh.
  const reload = useCallback(() => {}, []);

  return { ...state, reload };
}
