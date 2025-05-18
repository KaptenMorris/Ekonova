
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
console.log("Attempting Firebase initialization with effective config (API Key masked):", {
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
      console.log("Firebase App object after initializeApp:", app); // Log the app object
      if (app && app.name) { // Check if app object seems valid
        console.log("Firebase App initialized successfully. App name:", app.name);
        firebaseAppWasInitialized = true;
      } else {
        console.error("Firebase Core App Initialization WARNING: initializeApp did not return a valid app object. App object:", app);
        firebaseAppWasInitialized = false;
      }
    } catch (error: any) {
      console.error("Firebase Core App Initialization CATCH BLOCK Error:", error.message || error, "Code:", error.code || 'N/A');
      firebaseAppWasInitialized = false;
    }
  } else {
    app = getApps()[0];
    console.log("Existing Firebase App instance reused. App name:", app.name);
    firebaseAppWasInitialized = true; // Assume existing app was initialized correctly
  }

  if (firebaseAppWasInitialized && app && app.name) {
    try {
      authInstance = getAuth(app);
      console.log("Firebase Auth service initialized.");
    } catch (e: any) {
      console.error("Firebase Auth Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
    }

    try {
      console.log("Attempting to initialize Firestore... App object being passed to getFirestore:", app);
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
      console.error("Firebase Firestore Initialization CATCH BLOCK Error:", e.message || e, "Code:", e.code || 'N/A');
      firestoreWasInitialized = false;
    }

    try {
      storageInstance = getStorage(app);
      console.log("Firebase Storage service initialized.");
    } catch (e: any) {
      console.error("Firebase Storage Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
    }
  } else if (firebaseConfigIsValid) { 
    console.error("Firebase app object is not available or valid AFTER initialization attempt, despite initial config seeming valid. Firebase services (Auth, Firestore, Storage) will not be initialized.");
    firebaseAppWasInitialized = false; // Ensure this is false if app object is bad
    firestoreWasInitialized = false;
  }
} else {
    console.warn("Firebase initialization was SKIPPED due to invalid configuration. Check .env.local and previous logs.");
    firebaseAppWasInitialized = false;
    firestoreWasInitialized = false;
}

if (!firebaseConfigIsValid || !firebaseAppWasInitialized || !firestoreWasInitialized) {
  const CRITICAL_ERROR_MESSAGE = `
  **************************************************************************************************************************************************
  *                                                                                                                                                *
  *   🔥🔥🔥 CRITICAL FIREBASE INITIALIZATION FAILURE (POSSIBLY FIRESTORE) 🔥🔥🔥                                                              *
  *                                                                                                                                                *
  *   One or more Firebase services (especially Firestore if 'firestoreWasInitialized: false' below) are NOT correctly initialized.                *
  *   This is EXTREMELY LIKELY due to:                                                                                                             *
  *     1. Missing/incorrect environment variables in your '.env.local' file.                                                                      *
  *     2. Firestore Database NOT CREATED/ENABLED in your Firebase Project Console.                                                                *
  *     3. Incorrect Firestore Database URL or Project ID.                                                                                           *
  *                                                                                                                                                *
  *   >>> ACTION REQUIRED - CHECK THESE CAREFULLY:                                                                                                   *
  *   1. REVIEW CONSOLE LOGS ABOVE: Look for specific errors about which environment variables are missing or invalid (e.g., API_KEY, PROJECT_ID).  *
  *   2. '.env.local' FILE: Ensure ALL 'NEXT_PUBLIC_FIREBASE_...' variables are CORRECT and match your Firebase project.                            *
  *      - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Must be exact.                                                                                          *
  *      - NEXT_PUBLIC_FIREBASE_DATABASE_URL: For default region: 'https://<YOUR-PROJECT-ID>.firebaseio.com'. For specific region (e.g., europe-west1): 'https://<YOUR-PROJECT-ID>.<REGION>.firebasedatabase.app'. *
  *   3. FIREBASE CONSOLE -> Firestore Database:                                                                                                   *
  *      - Is a Firestore database CREATED? If it says "Create database", YOU MUST CREATE IT.                                                        *
  *      - Note the REGION of your Firestore database. Ensure it matches your DATABASE_URL if you use a region-specific one.                        *
  *   4. SERVER RESTART: You MUST restart your Next.js development server (Ctrl+C, then 'npm run dev') after ANY changes to '.env.local'.         *
  *                                                                                                                                                *
  *   >>> CURRENT INITIALIZATION STATUS:                                                                                                             *
  *       - firebaseConfigIsValid:   ${firebaseConfigIsValid}                                                                                                *
  *       - firebaseAppWasInitialized: ${firebaseAppWasInitialized}                                                                                            *
  *       - firestoreWasInitialized: ${firestoreWasInitialized} (If false, this is a MAJOR problem for database operations)                                  *
  *                                                                                                                                                *
  *   Your app WILL NOT function correctly regarding data storage or authentication until these issues are resolved.                                *
  *   "Client is offline" or "getFirestore() did not return a valid instance" errors are SYMPTOMS of this underlying initialization failure.       *
  *                                                                                                                                                *
  **************************************************************************************************************************************************
  `;
  console.error(CRITICAL_ERROR_MESSAGE);
  // Ensure exported services reflect the failure state if critical initialization failed
  if (!firestoreWasInitialized) dbInstance = {} as Firestore; // Ensure db is an empty object if Firestore fails
  if (!firebaseAppWasInitialized) {
    authInstance = {} as Auth;
    storageInstance = {} as FirebaseStorage;
  }
}

console.log(`--- Firebase Initialization FINAL STATUS ---`);
console.log(`firebaseConfigIsValid: ${firebaseConfigIsValid}`);
console.log(`firebaseAppWasInitialized: ${firebaseAppWasInitialized}`);
console.log(`firestoreWasInitialized: ${firestoreWasInitialized}`);
console.log(`Exporting db object type: ${typeof dbInstance}, looks like Firestore instance: ${dbInstance && typeof dbInstance.collection === 'function'}`);
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
    