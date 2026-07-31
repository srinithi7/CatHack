import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Nearest-fleet-idle demo: EQX2001 sits at S002 (Coimbatore South), ~12.5km
// from S003 — close enough to win over the yard. EQX2002 sits far away at
// S006 (Salem) to prove the distance sort actually picks the nearer one.
// A mainStorage unit is included too, just so it's visibly NOT picked
// (fleet idle machines are always preferred over yard sourcing).
const equipmentSeed = {
  EQX2001: {
    type: "Excavator",
    site: "S002",
    location: "Coimbatore South Site",
    lat: 10.9601,
    lng: 76.9558,
    checkIn: "2026-06-01",
    checkOut: "2026-07-20",
    rentalDays: 49,
    renter: null,
    customer: null,
    status: "idle",
  },
  EQX2002: {
    type: "Excavator",
    site: "S006",
    location: "Salem Mining Site",
    lat: 11.6643,
    lng: 78.1460,
    checkIn: "2026-05-01",
    checkOut: "2026-07-01",
    rentalDays: 61,
    renter: null,
    customer: null,
    status: "idle",
  },
};

const mainStorageSeed = {
  EQY9001: {
    type: "Excavator",
    location: "Main Storage Yard",
    lat: 11.0168,
    lng: 76.9558,
    fuelLevel: 100,
    status: "ready",
    healthClass: "Healthy",
  },
};

await set(ref(db, "equipment/EQX2001"), equipmentSeed.EQX2001);
await set(ref(db, "equipment/EQX2002"), equipmentSeed.EQX2002);
await set(ref(db, "mainStorage/EQY9001"), mainStorageSeed.EQY9001);

console.log("Seed complete: equipment/EQX2001, equipment/EQX2002, mainStorage/EQY9001");
process.exit(0);
