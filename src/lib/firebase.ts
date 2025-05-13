
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Ensure all NEXT_PUBLIC_ environment variables are correctly prefixed and assigned.
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional
const firebaseDatabaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL; // For Realtime DB if used, or for Firestore default project URL reference

// Define which environment variables are strictly required for initialization.
const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseAppId,
  // NEXT_PUBLIC_FIREBASE_DATABASE_URL is important for Firestore if not explicitly setting the region.
  // If you are using Firestore, ensure this (or a region-specific one) is set.
  // For now, let's make it optional as it's not always needed for basic auth/firestore if projectId is enough.
};

let firebaseConfigIsValid = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.startsWith('YOUR_') || value.startsWith('PASTE_') || value.includes('your-project-id') || value.includes('your-api-key')) {
    console.error(
      `Firebase Configuration Error: Environment variable ${key} is not set or is still a placeholder. Please update it in your .env.local file and restart the Next.js development server.`
    );
    firebaseConfigIsValid = false;
  }
}

if (!firebaseDatabaseURL) {
    console.warn(
      `Firebase Configuration Warning: NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set. This might be needed for certain Firebase services or for Firestore in specific regions. If you encounter issues, ensure this is set correctly.`
    );
    // Depending on strictness, you might not set firebaseConfigIsValid to false here
    // if basic auth/firestore can work with just projectId for the default region.
}


if (!firebaseConfigIsValid) {
  console.error("Firebase initialization will be attempted but may fail due to missing or placeholder environment variables. App functionality relying on Firebase will be affected. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in .env.local and the server is restarted.");
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  measurementId: firebaseMeasurementId, // Optional
  databaseURL: firebaseDatabaseURL, // Optional, but good to have for Firestore
};

let app: FirebaseApp;
let authInstance: any; // Use 'any' to avoid type issues if not initialized
let dbInstance: any;
let storageInstance: any;

// Attempt initialization only if the config is deemed valid enough
// This outer check for firebaseConfigIsValid ensures we don't try to init with known bad placeholder values.
if (firebaseConfigIsValid) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error: any) {
      console.error("Firebase Initialization Error:", error.message || error);
      // If init fails, mark config as invalid to prevent further SDK use attempts
      firebaseConfigIsValid = false;
    }
  } else {
    app = getApps()[0];
  }

  // Proceed with SDK service initialization only if 'app' was successfully initialized
  if (app! && firebaseConfigIsValid) {
    try {
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        storageInstance = getStorage(app);

        // Emulator Setup (Optional - for local development)
        // if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        //   // Ensure emulators are running before uncommenting these lines.
        //   try {
        //     console.log("Connecting to Firebase Emulators (if running)...");
        //     // connectAuthEmulator(authInstance, 'http://localhost:9099', { disableWarnings: true });
        //     // connectFirestoreEmulator(dbInstance, 'localhost', 8080);
        //     // connectStorageEmulator(storageInstance, 'localhost', 9199);
        //     // console.log("Attempted connection to Firebase Emulators.");
        //   } catch (error) {
        //     console.warn("Error connecting to Firebase Emulators (they might not be running):", error);
        //   }
        // }

    } catch (sdkError: any) {
        console.error("Firebase SDK Service Initialization Error:", sdkError.message || sdkError);
        // Mark config as invalid if any SDK service fails to initialize
        firebaseConfigIsValid = false; 
        // Set instances to empty objects to prevent runtime errors on access
        authInstance = {};
        dbInstance = {};
        storageInstance = {};
    }
  } else {
    // Fallback if app initialization failed
    app = {} as FirebaseApp; // Avoid null/undefined app object
    authInstance = {};
    dbInstance = {};
    storageInstance = {};
    if (firebaseConfigIsValid) { // If it was valid but app init failed for other reasons
        console.warn("Firebase SDKs (auth, db, storage) are not properly initialized due to an error during app initialization. Firebase config seemed valid initially.");
        firebaseConfigIsValid = false; // Mark as invalid due to app init failure
    }
  }
} else {
  // Fallback for when firebaseConfigIsValid was false from the start
  app = {} as FirebaseApp;
  authInstance = {};
  dbInstance = {};
  storageInstance = {};
  console.warn("Firebase SDKs (auth, db, storage) are not initialized due to configuration errors. Please check your .env.local file and restart the server.");
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage, firebaseConfigIsValid };
