// Global auth state for KOZY. Wraps Firebase Auth + the users/{uid} profile doc.
// Replaces the hardcoded isLoggedIn / isLogedIn booleans across screens.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToAuth } from '@/lib/auth';
import { getUserDoc } from '@/lib/db/users';

const AuthContext = createContext(null);

const PROFILE_RETRY_LIMIT = 3;
const PROFILE_RETRY_DELAY_MS = 1500;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase Auth user (or null)
  const [profile, setProfile] = useState(null); // users/{uid} doc (or null)
  const [initializing, setInitializing] = useState(true); // true until first auth callback
  const profileRetriesRef = useRef(0);
  const [profileRetryTick, setProfileRetryTick] = useState(0); // re-arms the retry effect after a failed attempt

  useEffect(() => {
    const unsubscribe = subscribeToAuth(({ user: nextUser, profile: nextProfile }) => {
      setUser(nextUser);
      setProfile(nextProfile);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Self-heal a missing profile: the one-shot fetch in subscribeToAuth can miss the
  // users doc (network hiccup, or right after signup before createUserDoc lands).
  // Without this, `profile` stays null for the whole session and everything that
  // reads it (edit profile, gates, owner caches) misbehaves.
  useEffect(() => {
    if (initializing || !user || profile) {
      profileRetriesRef.current = 0;
      return undefined;
    }
    if (profileRetriesRef.current >= PROFILE_RETRY_LIMIT) return undefined;

    const timer = setTimeout(async () => {
      profileRetriesRef.current += 1;
      try {
        const fresh = await getUserDoc(user.uid);
        if (fresh) {
          setProfile(fresh);
          return;
        }
      } catch {
        // fall through to re-arm
      }
      setProfileRetryTick((tick) => tick + 1); // re-arm for the next attempt
    }, PROFILE_RETRY_DELAY_MS * (profileRetriesRef.current + 1));

    return () => clearTimeout(timer);
  }, [initializing, user, profile, profileRetryTick]);

  // Re-fetch the profile doc (e.g. after editProfile saves).
  const refreshProfile = async () => {
    if (!user) return null;
    const fresh = await getUserDoc(user.uid);
    setProfile(fresh);
    return fresh;
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      initializing,
      isLoggedIn: !!user,
      uid: user?.uid ?? null,
      refreshProfile,
    }),
    [user, profile, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
