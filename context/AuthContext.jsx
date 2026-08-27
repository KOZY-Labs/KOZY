// Global auth state for KOZY. Wraps Firebase Auth + the users/{uid} profile doc.
// Replaces the hardcoded isLoggedIn / isLogedIn booleans across screens.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToAuth } from '@/lib/auth';
import { getUserDoc, subscribeToUserDoc } from '@/lib/db/users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase Auth user (or null)
  const [profile, setProfile] = useState(null); // users/{uid} doc (or null)
  const [initializing, setInitializing] = useState(true); // true until first auth callback

  useEffect(() => {
    const unsubscribe = subscribeToAuth(({ user: nextUser, profile: nextProfile }) => {
      setUser(nextUser);
      setProfile(nextProfile);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Live users/{uid} subscription. This is the profile's source of truth for the whole
  // session: it self-heals a fetch that failed at cold start (the SDK retries
  // connectivity internally), delivers the doc the moment createUserDoc lands after
  // signup, and propagates server-side changes (verified flag, admin edits) without
  // any manual refresh. Never clobbers with null — the doc briefly "not existing"
  // (signup window) keeps the last known value until real data arrives.
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToUserDoc(uid, (fresh) => {
      if (fresh) setProfile(fresh);
    });
  }, [uid]);

  // Re-fetch the profile doc (e.g. after editProfile saves). Accepts an already-fetched
  // doc so callers that just loaded it (syncProfileCaches) don't pay a second read.
  const refreshProfile = React.useCallback(
    async (preloaded) => {
      if (!user) return null;
      const fresh = preloaded ?? (await getUserDoc(user.uid));
      setProfile(fresh);
      return fresh;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      initializing,
      isLoggedIn: !!user,
      uid: user?.uid ?? null,
      refreshProfile,
    }),
    [user, profile, initializing, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
