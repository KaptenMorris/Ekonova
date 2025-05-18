
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, Timestamp } from 'firebase/firestore';
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
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: firebaseDatabaseURL, // Making this required for clarity with Firestore
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
    // Log the value if it's not the API key for easier debugging
    if (key !== 'NEXT_PUBLIC_FIREBASE_API_KEY') {
      console.log(`Firebase Config Check: ${key} = ${value}`);
    } else {
      console.log(`Firebase Config Check: ${key} = ****** (set)`);
    }
  }
}

if (!firebaseConfigIsValid) {
  console.error("CRITICAL WARNING: One or more Firebase configuration variables are missing or invalid. Firebase initialization will be SKIPPED or will likely FAIL. Review the errors above and ensure your .env.local file is correct and the Next.js server has been RESTARTED.");
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
  measurementId: firebaseMeasurementId, // Optional, can be undefined
  databaseURL: firebaseDatabaseURL,     // Important for Firestore, especially if region-specific
};

// Log the actual config being used (except API key for security)
console.log("Attempting Firebase initialization with effective config (API Key masked):", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '****** (set)' : 'NOT SET or invalid',
});

let app: FirebaseApp = {} as FirebaseApp; // Initialize with an empty object type assertion
let authInstance: Auth = {} as Auth;
let dbInstance: Firestore = {} as Firestore;
let storageInstance: FirebaseStorage = {} as FirebaseStorage;

if (firebaseConfigIsValid) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase App object after initializeApp:", app); // Log the app object
      // Robust check for a valid app object
      if (app && app.name && typeof app.options === 'object' && app.options.projectId) {
        console.log("Firebase App initialized successfully. App name:", app.name, "Project ID from app.options:", app.options.projectId);
        firebaseAppWasInitialized = true;
      } else {
        console.error("Firebase Core App Initialization WARNING: initializeApp did not return a valid app object or the app object is empty/malformed. This often means core config like API_KEY or PROJECT_ID is incorrect in .env.local. App object:", app);
        firebaseAppWasInitialized = false;
      }
    } catch (error: any) {
      console.error("Firebase Core App Initialization CATCH BLOCK Error:", error.message || error, "Code:", error.code || 'N/A');
      firebaseAppWasInitialized = false;
    }
  } else {
    app = getApps()[0];
    console.log("Existing Firebase App instance reused. App name:", app.name);
    // Assuming existing app was initialized correctly
    if (app && app.name && typeof app.options === 'object' && app.options.projectId) {
        firebaseAppWasInitialized = true;
    } else {
        console.warn("Existing Firebase App instance appears invalid or incomplete. Forcing re-check.");
        firebaseAppWasInitialized = false; // This might be too aggressive, but safer for debugging
    }
  }

  if (firebaseAppWasInitialized && app && app.name && typeof app.options === 'object' && app.options.projectId) { // Ensure app is valid
    try {
      authInstance = getAuth(app);
      console.log("Firebase Auth service initialized.");
    } catch (e: any) {
      console.error("Firebase Auth Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
      // authInstance remains {} as Auth
    }

    try {
      console.log("Attempting to initialize Firestore... Firebase App Name:", app.name, "App Options (PROJECT_ID check):", app.options?.projectId);
      dbInstance = getFirestore(app);
      // Check if dbInstance looks like a valid Firestore instance
      if (dbInstance && typeof dbInstance.collection === 'function' && typeof (dbInstance as any).app === 'object' && (dbInstance as any).app.options.projectId === app.options.projectId) {
        console.log("Firebase Firestore service initialized SUCCESSFULLY. Project ID from Firestore instance:", (dbInstance as any).app.options.projectId);
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
      // storageInstance remains {} as FirebaseStorage
    }
  } else if (firebaseConfigIsValid) {
    console.error("Firebase app object is NOT available or valid AFTER initialization attempt, despite initial config seeming valid. Firebase services (Auth, Firestore, Storage) will not be initialized. This STRONGLY indicates an issue with your core Firebase config in .env.local (API_KEY, PROJECT_ID, etc.).");
    firebaseAppWasInitialized = false; // Ensure this is false if app object isn't good
    firestoreWasInitialized = false;
  }
} else {
    console.warn("Firebase initialization was SKIPPED due to invalid configuration (`firebaseConfigIsValid` is false). Check .env.local and previous logs.");
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
  *     1. Missing/incorrect environment variables in your '.env.local' file (VERIFY THEM METICULOUSLY!).                                          *
  *     2. Firestore Database NOT CREATED/ENABLED in your Firebase Project Console (GO TO FIREBASE CONSOLE -> Firestore Database -> Create database).*
  *     3. Incorrect Firestore Database URL or Project ID in '.env.local'.                                                                         *
  *                                                                                                                                                *
  *   >>> ACTION REQUIRED - CHECK THESE CAREFULLY:                                                                                                   *
  *   1. REVIEW CONSOLE LOGS ABOVE THIS MESSAGE: Look for specific errors about which environment variables are missing or invalid.                 *
  *   2. '.env.local' FILE: Ensure ALL 'NEXT_PUBLIC_FIREBASE_...' variables are CORRECT and match your Firebase project.                            *
  *      - NEXT_PUBLIC_FIREBASE_API_KEY: Must be exact.                                                                                             *
  *      - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Must be exact.                                                                                          *
  *      - NEXT_PUBLIC_FIREBASE_DATABASE_URL: For default region: 'https://<YOUR-PROJECT-ID>.firebaseio.com'.                                       *
  *        For specific region (e.g., europe-west1): 'https://<YOUR-PROJECT-ID>.<REGION>.firebasedatabase.app'.                                      *
  *        DOUBLE-CHECK THIS against your Firestore database's region in the Firebase console.                                                       *
  *   3. FIREBASE CONSOLE -> Firestore Database:                                                                                                   *
  *      - Is a Firestore database **CREATED**? If it says "Create database", YOU MUST CREATE IT.                                                     *
  *      - Note the **REGION** of your Firestore database. Ensure it aligns with DATABASE_URL if you use a region-specific one.                      *
  *   4. SERVER RESTART: You MUST restart your Next.js development server (Ctrl+C, then 'npm run dev') after ANY changes to '.env.local'.         *
  *                                                                                                                                                *
  *   >>> CURRENT INITIALIZATION STATUS:                                                                                                             *
  *       - firebaseConfigIsValid:   ${firebaseConfigIsValid}                                                                                                *
  *       - firebaseAppWasInitialized: ${firebaseAppWasInitialized} (If false, core Firebase app did not start. Check API_KEY & PROJECT_ID!)                *
  *       - firestoreWasInitialized: ${firestoreWasInitialized} (If false, Firestore service is not ready. This is a MAJOR problem for database operations) *
  *                                                                                                                                                *
  *   Your app WILL NOT function correctly regarding data storage or authentication until these issues are resolved.                                *
  *   "Client is offline" or "getFirestore() did not return a valid instance" errors are SYMPTOMS of this underlying initialization failure.       *
  *                                                                                                                                                *
  **************************************************************************************************************************************************
  `;
  console.error(CRITICAL_ERROR_MESSAGE);
  // Ensure exported services reflect the failure state if critical initialization failed
  if (!firestoreWasInitialized) dbInstance = {} as Firestore; // Ensure db is an empty object if not initialized
  if (!firebaseAppWasInitialized) {
    authInstance = {} as Auth; // Ensure auth is an empty object
    storageInstance = {} as FirebaseStorage; // Ensure storage is an empty object
    dbInstance = {} as Firestore; // dbInstance is definitely not going to be valid if app itself failed
  }
}

console.log(`--- Firebase Initialization FINAL STATUS ---`);
console.log(`firebaseConfigIsValid: ${firebaseConfigIsValid}`);
console.log(`firebaseAppWasInitialized: ${firebaseAppWasInitialized}`);
console.log(`firestoreWasInitialized: ${firestoreWasInitialized}`);
console.log(`Exporting db object. Is it a valid Firestore instance (should have a .collection method)? ${dbInstance && typeof dbInstance.collection === 'function'}`);
console.log(`Type of dbInstance: ${typeof dbInstance}, Is dbInstance an empty object? ${Object.keys(dbInstance).length === 0 && dbInstance.constructor === Object}`);
console.log(`--------------------------------------`);


export {
  app, // Exporting app can be useful for more advanced Firebase SDK usage
  authInstance as auth,
  dbInstance as db,
  storageInstance as storage,
  firebaseConfigIsValid, // Exporting flags for use in other parts of the app
  firebaseAppWasInitialized,
  firestoreWasInitialized
};
