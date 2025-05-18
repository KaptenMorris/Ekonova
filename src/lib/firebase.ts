
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, Timestamp } from 'firebase/firestore'; // Added Timestamp for db check
import { getStorage, type FirebaseStorage } from 'firebase/storage';

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
const requiredEnvVars: Record<string, string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseAppId,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: firebaseDatabaseURL, // Explicitly required for Firestore
};

let firebaseConfigIsValid = true;
let firebaseAppWasInitialized = false;
let firestoreWasInitialized = false;

console.log("--- Firebase Configuration Check START ---");
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.startsWith('YOUR_') || value.startsWith('PASTE_') || value.includes('your-project-id') || value.includes('your-api-key') || value.includes('your-database-url')) {
    console.error(
      `Firebase Configuration Error: Environment variable ${key} is not set or is still a placeholder. Please update it in your .env.local file and restart the Next.js development server.`
    );
    firebaseConfigIsValid = false;
  } else {
    if (key !== 'NEXT_PUBLIC_FIREBASE_API_KEY') { // Don't log the actual API key value
      console.log(`Firebase Config Check: ${key} = ${value}`);
    } else {
      console.log(`Firebase Config Check: ${key} = ****** (set)`);
    }
  }
}

if (!firebaseConfigIsValid) {
  console.error("CRITICAL: One or more Firebase configuration variables are missing or invalid. Firebase initialization will be SKIPPED or will likely FAIL. Review the errors above.");
}
console.log("--- Firebase Configuration Check END ---");
console.log(`Firebase Config Check Result: firebaseConfigIsValid = ${firebaseConfigIsValid}`);


const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  measurementId: firebaseMeasurementId,
  databaseURL: firebaseDatabaseURL,
};

// Log the actual config being used (except API key for security)
console.log("Effective Firebase Config being used for initialization (API Key masked):", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '****** (set)' : 'NOT SET or invalid',
});

let app: FirebaseApp = {} as FirebaseApp;
let authInstance: Auth = {} as Auth;
let dbInstance: Firestore = {} as Firestore;
let storageInstance: FirebaseStorage = {} as FirebaseStorage;

if (firebaseConfigIsValid) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase App initialized successfully.");
      firebaseAppWasInitialized = true;
    } catch (error: any) {
      console.error("Firebase Core App Initialization Error:", error.message || error, "Code:", error.code || 'N/A');
      firebaseAppWasInitialized = false;
    }
  } else {
    app = getApps()[0];
    console.log("Existing Firebase App instance reused.");
    firebaseAppWasInitialized = true; // Assume existing app was initialized correctly
  }

  if (firebaseAppWasInitialized && app && Object.keys(app).length > 0 && (app as any).name) {
    try {
      authInstance = getAuth(app);
      console.log("Firebase Auth service initialized.");
    } catch (e: any) {
      console.error("Firebase Auth Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
    }

    console.log("Attempting to initialize Firestore...");
    try {
      dbInstance = getFirestore(app);
      // Basic check if dbInstance looks like a Firestore instance
      if (dbInstance && typeof dbInstance.collection === 'function') {
        console.log("Firebase Firestore service initialized SUCCESSFULLY.");
        firestoreWasInitialized = true;
      } else {
        console.error("Firebase Firestore Initialization WARNING: getFirestore() did not return a valid Firestore instance. dbInstance:", dbInstance);
        firestoreWasInitialized = false;
      }
    } catch (e: any) {
      console.error("Firebase Firestore Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
      firestoreWasInitialized = false;
    }

    try {
      storageInstance = getStorage(app);
      console.log("Firebase Storage service initialized.");
    } catch (e: any) {
      console.error("Firebase Storage Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
    }
  } else if (firebaseConfigIsValid) { 
    console.error("Firebase app object is not available or valid AFTER initialization attempt, despite initial config seeming valid. Firebase services will not be initialized.");
    firebaseAppWasInitialized = false;
    firestoreWasInitialized = false;
  }
} else {
    console.warn("Firebase initialization was SKIPPED due to invalid configuration. Check .env.local and previous logs.");
    firebaseAppWasInitialized = false; // Ensure these are false if config is invalid
    firestoreWasInitialized = false;
}

if (!firebaseConfigIsValid || !firebaseAppWasInitialized || !firestoreWasInitialized) {
  const CRITICAL_ERROR_MESSAGE = `
  **************************************************************************************************************************************************
  *                                                                                                                                                *
  *   🔥🔥🔥 CRITICAL FIREBASE CONFIGURATION/INITIALIZATION ERROR 🔥🔥🔥                                                                           *
  *                                                                                                                                                *
  *   One or more Firebase services (especially Firestore) are NOT correctly initialized.                                                            *
  *   This is EXTREMELY LIKELY due to missing/incorrect environment variables in your '.env.local' file,                                           *
  *   or fundamental issues with your Firebase project setup (e.g., Firestore database not created/enabled, or incorrect region settings).         *
  *                                                                                                                                                *
  *   >>> FINAL INITIALIZATION STATUS FROM firebase.ts:                                                                                              *
  *       - firebaseConfigIsValid:   ${firebaseConfigIsValid}                                                                                                *
  *       - firebaseAppWasInitialized: ${firebaseAppWasInitialized}                                                                                            *
  *       - firestoreWasInitialized: ${firestoreWasInitialized}                                                                                              *
  *                                                                                                                                                *
  *   ACTION REQUIRED:                                                                                                                               *
  *   1. CAREFULLY REVIEW THE CONSOLE LOGS ABOVE THIS MESSAGE. Look for specific errors about which environment variables are missing or invalid.     *
  *   2. DOUBLE-CHECK your '.env.local' file: Ensure ALL 'NEXT_PUBLIC_FIREBASE_...' variables are correctly set, with NO PLACEHOLDERS,               *
  *      and perfectly match your Firebase project console values (Project Settings -> General -> Your apps -> Config).                              *
  *      Pay EXTREME attention to:                                                                                                                   *
  *         - NEXT_PUBLIC_FIREBASE_PROJECT_ID                                                                                                        *
  *         - NEXT_PUBLIC_FIREBASE_DATABASE_URL (Must match your Firestore region if specific, e.g., https://your-project-id.europe-west1.firebasedatabase.app) *
  *   3. FIREBASE CONSOLE:                                                                                                                           *
  *      - Is your Firestore Database CREATED and ENABLED? (Firestore Database -> Create database)                                                  *
  *      - Is "Email/Password" Authentication ENABLED? (Authentication -> Sign-in method)                                                            *
  *   4. SERVER RESTART: You MUST restart your Next.js development server (Ctrl+C, then npm run dev) after ANY changes to '.env.local'.             *
  *                                                                                                                                                *
  *   The application WILL NOT function correctly regarding data storage or authentication until these issues are resolved.                        *
  *   "Client is offline" errors are a SYMPTOM of this underlying initialization failure.                                                          *
  *                                                                                                                                                *
  **************************************************************************************************************************************************
  `;
  console.error(CRITICAL_ERROR_MESSAGE);
  // Ensure exported services reflect the failure state if critical initialization failed
  if (!firestoreWasInitialized) dbInstance = {} as Firestore;
  if (!firebaseAppWasInitialized) {
    authInstance = {} as Auth;
    storageInstance = {} as FirebaseStorage;
  }
}

console.log(`--- Firebase Initialization FINAL STATUS ---`);
console.log(`firebaseConfigIsValid: ${firebaseConfigIsValid}`);
console.log(`firebaseAppWasInitialized: ${firebaseAppWasInitialized}`);
console.log(`firestoreWasInitialized: ${firestoreWasInitialized}`);
console.log(`Exporting db object:`, dbInstance && typeof dbInstance.collection === 'function' ? 'Looks like a valid Firestore instance' : 'db object IS EMPTY or INVALID after initialization attempt');
console.log(`--------------------------------------`);


export {
  app,
  authInstance as auth,
  dbInstance as db,
  storageInstance as storage,
  firebaseConfigIsValid,
  firebaseAppWasInitialized,
  firestoreWasInitialized
};

    