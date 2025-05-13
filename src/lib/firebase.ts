
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
// const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseAppId,
};

let firebaseConfigIsValid = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.startsWith('YOUR_') || value.startsWith('PASTE_') || value === 'your-project-id') {
    console.error(
      `Firebase Configuration Error: Environment variable ${key} is not set or is still a placeholder. Please update it in your .env.local file.`
    );
    firebaseConfigIsValid = false;
  }
}

if (!firebaseConfigIsValid) {
  // Throwing an error here might be too disruptive for initial load if some parts of app can work without Firebase.
  // Consider a state or a flag that other parts of the app can check.
  console.error("Firebase initialization failed due to missing or placeholder environment variables. App functionality relying on Firebase will be affected.");
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  // measurementId: firebaseMeasurementId, // Optional
};

let app: FirebaseApp;
let authInstance: any; // Use 'any' to avoid type issues if not initialized
let dbInstance: any;
let storageInstance: any;

if (firebaseConfigIsValid) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);

  // --- Emulator Setup (Optional - for local development) ---
  // if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  //   // Ensure emulators are running before uncommenting these lines.
  //   // try {
  //   //   console.log("Connecting to Firebase Emulators...");
  //   //   connectAuthEmulator(authInstance, 'http://localhost:9099', { disableWarnings: true });
  //   //   connectFirestoreEmulator(dbInstance, 'localhost', 8080);
  //   //   connectStorageEmulator(storageInstance, 'localhost', 9199);
  //   //   console.log("Successfully connected to Firebase Emulators.");
  //   // } catch (error) {
  //   //   console.warn("Error connecting to Firebase Emulators (they might not be running):", error);
  //   // }
  // }
} else {
  // Provide dummy instances or handle the uninitialized state gracefully
  // This prevents errors if other parts of the code try to use these exports when config is invalid
  app = {} as FirebaseApp; // Cast to avoid type errors, but it's a non-functional instance
  authInstance = {};
  dbInstance = {};
  storageInstance = {};
  console.warn("Firebase SDKs (auth, db, storage) are not initialized due to configuration errors.");
}


export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
