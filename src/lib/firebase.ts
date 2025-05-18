
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
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
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: firebaseDatabaseURL, // Making this explicitly required for Firestore
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
  measurementId: firebaseMeasurementId,
  databaseURL: firebaseDatabaseURL,
};

let app: FirebaseApp = {} as FirebaseApp;
let authInstance: Auth = {} as Auth;
let dbInstance: Firestore = {} as Firestore;
let storageInstance: FirebaseStorage = {} as FirebaseStorage;

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

  if (firebaseConfigIsValid && app && Object.keys(app).length > 0 && (app as any).name) { // Check if app is a valid FirebaseApp
    try {
      authInstance = getAuth(app);
      console.log("Firebase Auth service initialized.");
    } catch (e: any) {
      console.error("Firebase Auth Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
      // Don't necessarily set firebaseConfigIsValid to false, auth might be optional for some parts if db is primary.
    }

    try {
      dbInstance = getFirestore(app);
      console.log("Firebase Firestore service initialized.");
    } catch (e: any) {
      console.error("Firebase Firestore Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
      firebaseConfigIsValid = false; // Firestore is critical for this app
    }

    try {
      storageInstance = getStorage(app);
      console.log("Firebase Storage service initialized.");
    } catch (e: any) {
      console.error("Firebase Storage Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
    }
  } else if (firebaseConfigIsValid) {
    console.error("Firebase app object is not available or valid after initialization attempt, despite initial config seeming valid. Firebase services will not be initialized.");
    firebaseConfigIsValid = false;
  }
}

if (!firebaseConfigIsValid) {
  const CRITICAL_ERROR_MESSAGE = `
  ******************************************************************************************
  CRITICAL FIREBASE CONFIGURATION ERROR: Firebase SDKs (especially Firestore)
  are NOT correctly initialized. This is likely due to missing or incorrect
  environment variables in your '.env.local' file, or issues with your
  Firebase project setup (e.g., Firestore database not created/enabled).

  PLEASE CHECK THE FOLLOWING:
  1. '.env.local' file: Ensure all 'NEXT_PUBLIC_FIREBASE_...' variables are
     correctly set with NO PLACEHOLDERS and match your Firebase project console.
     Pay special attention to NEXT_PUBLIC_FIREBASE_PROJECT_ID and
     NEXT_PUBLIC_FIREBASE_DATABASE_URL.
  2. Firebase Console:
     - Is Firestore Database CREATED and ENABLED for your project ('${firebaseProjectId || 'PROJECT_ID_MISSING!'}')?
     - Is "Email/Password" Authentication ENABLED under Authentication -> Sign-in method?
     - Is "Google" Authentication ENABLED under Authentication -> Sign-in method (if you use Google Sign-In)?
  3. Server Restart: You MUST restart your Next.js development server after
     any changes to '.env.local'.

  The application WILL NOT function correctly regarding data storage or
  authentication until these issues are resolved.
  Review the console logs ABOVE this message for specific variable errors.
  ******************************************************************************************
  `;
  console.error(CRITICAL_ERROR_MESSAGE);
  // Ensure exported services are indeed "empty" or clearly indicate failure
  authInstance = {} as Auth;
  dbInstance = {} as Firestore;
  storageInstance = {} as FirebaseStorage;
}

// Export auth, db, storage, and the validity flag
export { app, authInstance as auth, dbInstance as db, storageInstance as storage, firebaseConfigIsValid };
    
