
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional
const firebaseDatabaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL; // Optional, for Realtime DB

const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseAppId,
  // Measurement ID and Database URL are often optional for core functionality but good to check if used
  // NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: firebaseMeasurementId,
  // NEXT_PUBLIC_FIREBASE_DATABASE_URL: firebaseDatabaseURL,
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

if (!firebaseConfigIsValid) {
  console.error("Firebase initialization failed due to missing or placeholder environment variables. App functionality relying on Firebase will be affected. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in .env.local and the server is restarted.");
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  measurementId: firebaseMeasurementId, // Optional
  databaseURL: firebaseDatabaseURL, // Optional
};

let app: FirebaseApp;
let authInstance: any; // Use 'any' to avoid type issues if not initialized
let dbInstance: any;
let storageInstance: any;

if (firebaseConfigIsValid) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase Initialization Error:", error);
      firebaseConfigIsValid = false; // Mark as invalid if initializeApp fails
    }
  } else {
    app = getApps()[0];
  }

  if (firebaseConfigIsValid && app!) { // Ensure app was initialized
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);

    // --- Emulator Setup (Optional - for local development) ---
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
  } else {
    // Fallback if app initialization failed even if config was thought to be valid initially
    app = {} as FirebaseApp;
    authInstance = {};
    dbInstance = {};
    storageInstance = {};
    console.warn("Firebase SDKs (auth, db, storage) are not properly initialized due to an error during app initialization or invalid config.");
  }
} else {
  // Provide dummy instances or handle the uninitialized state gracefully
  app = {} as FirebaseApp; 
  authInstance = {};
  dbInstance = {};
  storageInstance = {};
  console.warn("Firebase SDKs (auth, db, storage) are not initialized due to configuration errors. Please check your .env.local file and restart the server.");
}


export { app, authInstance as auth, dbInstance as db, storageInstance as storage, firebaseConfigIsValid };
