import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.REACT_APP_FIREBASE_APP_ID,
};

// True once real config values are present. Every hook in ./hooks.js checks
// this and falls back to rule-based/offline behavior instead of throwing —
// the app must keep working before the .env is filled in, and if the ESP32
// or FastAPI writers ever go quiet.
export const isFirebaseConfigured = Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey);

let app = null;
let db = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getDatabase(app);
} else {
  console.warn(
    "[firebase] REACT_APP_FIREBASE_* env vars are not set — dashboard will run on rule-based fallback data until they're provided."
  );
}

export { app, db };
