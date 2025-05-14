
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Get environment variables
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional
const firebaseDatabaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL; // Crucial for specific Firestore regions

// Define which environment variables are absolutely necessary
const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseAppId,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: firebaseDatabaseURL, // Making this required for clarity with Firestore
};

let firebaseConfigIsValid = true;
console.log("--- Firebase Configuration Check START ---");
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.startsWith('YOUR_') || value.startsWith('PASTE_') || value.includes('your-project-id') || value.includes('your-api-key') || value.includes('your-database-url')) {
    console.error(
      `Firebase Configuration Error: Environment variable ${key} is not set or is still a placeholder. Please update it in your .env.local file and restart the Next.js development server.`
    );
    firebaseConfigIsValid = false;
  } else {
    // Log the actual value being used, except for the API key
    if (key !== 'NEXT_PUBLIC_FIREBASE_API_KEY') {
      console.log(`Firebase Config Check: ${key} = ${value}`);
    } else {
      console.log(`Firebase Config Check: ${key} = ****** (set)`);
    }
  }
}

if (!firebaseConfigIsValid) {
  console.error("CRITICAL: Firebase initialization will be SKIPPED due to missing or placeholder values in environment variables. App functionality relying on Firebase will be affected. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in .env.local and the server has been restarted.");
}
console.log("--- Firebase Configuration Check END ---");


const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  measurementId: firebaseMeasurementId, // Optional, can be undefined
  databaseURL: firebaseDatabaseURL, // Crucial for specific Firestore regions
};

let app: FirebaseApp = {} as FirebaseApp;
let authInstance: any = {};
let dbInstance: any = {};
let storageInstance: any = {};

if (firebaseConfigIsValid) {
  console.log("Attempting Firebase initialization with effective config:", {
    apiKey: firebaseConfig.apiKey ? '****** (set)' : 'NOT SET or invalid',
    authDomain: firebaseConfig.authDomain || 'NOT SET or invalid',
    projectId: firebaseConfig.projectId || 'NOT SET or invalid',
    storageBucket: firebaseConfig.storageBucket || 'NOT SET or invalid',
    messagingSenderId: firebaseConfig.messagingSenderId || 'NOT SET or invalid',
    appId: firebaseConfig.appId || 'NOT SET or invalid',
    measurementId: firebaseConfig.measurementId || 'NOT SET (Optional)',
    databaseURL: firebaseConfig.databaseURL || 'NOT SET or invalid (Required for Firestore)',
  });

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase App initialized successfully.");
    } catch (error: any) {
      console.error("Firebase Core App Initialization Error:", error.message || error, "Code:", error.code || 'N/A');
      firebaseConfigIsValid = false; 
    }
  } else {
    app = getApps()[0];
    console.log("Existing Firebase App instance reused.");
  }

  if (firebaseConfigIsValid && app && Object.keys(app).length > 0 && app.name) {
    try {
      authInstance = getAuth(app);
      console.log("Firebase Auth service initialized.");
    } catch (e: any) {
      console.error("Firebase Auth Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
      // No need to set firebaseConfigIsValid = false here again, as auth might be optional for some parts
    }

    try {
      dbInstance = getFirestore(app);
      console.log("Firebase Firestore service initialized.");
    } catch (e: any) {
      console.error("Firebase Firestore Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
      firebaseConfigIsValid = false; // If Firestore fails, and it's needed, this is critical
    }

    try {
      storageInstance = getStorage(app);
      console.log("Firebase Storage service initialized.");
    } catch (e: any) {
      console.error("Firebase Storage Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
      // Storage might be optional
    }
  } else if (firebaseConfigIsValid) { // Only if config was initially thought to be valid
    console.error("Firebase app object is not available or valid after initialization attempt, despite initial config seeming valid. Firebase services will not be initialized.");
    firebaseConfigIsValid = false;
  }
}

if (!firebaseConfigIsValid) {
  console.warn("CRITICAL WARNING: Firebase SDKs (especially Firestore if it's the goal) are NOT correctly initialized due to configuration or initialization errors. Check .env.local, Firebase project settings, and restart the server. App functionality relying on Firebase WILL BE IMPACTED.");
  // Ensure exported services are indeed empty or throw if config is invalid and they are accessed
  authInstance = authInstance || {}; // Keep as empty object if it failed but app should limp along
  dbInstance = dbInstance || {};     // Same for db
  storageInstance = storageInstance || {};
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage, firebaseConfigIsValid };
