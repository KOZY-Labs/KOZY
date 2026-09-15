// Firebase app initialization for KOZY (Expo / React Native).
//
// Reads EXPO_PUBLIC_FIREBASE_* from .env.local. See .env.example.
// Auth uses AsyncStorage persistence on native so the session survives app restarts.
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import * as firebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Fail loudly during development if config is missing, instead of cryptic SDK errors later.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    '[firebase] Missing EXPO_PUBLIC_FIREBASE_* env vars. ' +
      'Fill .env.local (see .env.example) and restart with `npx expo start -c`.'
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth persistence: AsyncStorage on native, default (in-memory/local) on web.
// `getReactNativePersistence` exists in the React Native bundle but not the web one,
// so resolve it defensively.
function resolveAuth() {
  const { initializeAuth, getAuth, browserLocalPersistence } = firebaseAuth;
  // Accessed dynamically: it exists in the React Native bundle but not the Node/web one,
  // which the import/namespace rule (resolving Node) cannot see — hence the disable.
  // eslint-disable-next-line import/namespace
  const getReactNativePersistence = firebaseAuth['getReactNativePersistence'];

  if (Platform.OS !== 'web' && typeof getReactNativePersistence === 'function') {
    try {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // initializeAuth throws if called twice (e.g. Fast Refresh) — fall back to getAuth.
      return getAuth(app);
    }
  }

  try {
    return initializeAuth(app, { persistence: browserLocalPersistence });
  } catch {
    return getAuth(app);
  }
}

export const auth = resolveAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
// Callables are deployed to us-central1 (see functions/src/*: REGION).
export const functions = getFunctions(app, 'us-central1');
export default app;
