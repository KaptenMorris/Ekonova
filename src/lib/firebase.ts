
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
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: firebaseDatabaseURL, // Treating this as essential for Firestore
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
    // Mask API key for security
    if (key === 'NEXT_PUBLIC_FIREBASE_API_KEY') {
      console.log(`Firebase Config Check: ${key} = ****** (set)`);
    } else {
      console.log(`Firebase Config Check: ${key} = ${value}`);
    }
  }
}

if (!firebaseConfigIsValid) {
  console.error(
    "CRITICAL WARNING: One or more Firebase configuration variables are missing or invalid. Firebase initialization will be SKIPPED or will likely FAIL. Review the errors above and ensure your .env.local file is correct and the Next.js server has been RESTARTED."
  );
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
      console.log("Firebase App object after initializeApp:", app);
      // More robust check for app initialization success
      if (app && app.name && typeof app.options === 'object' && app.options.projectId === firebaseProjectId) {
        console.log("Firebase App initialized successfully. App name:", app.name, "Project ID from app.options:", app.options.projectId);
        firebaseAppWasInitialized = true;
      } else {
        console.error(
          "Firebase Core App Initialization WARNING: initializeApp did not return a valid app object, or the app's projectId does not match. This often means core config like API_KEY or PROJECT_ID is incorrect in .env.local. App object:",
          app,
          "Expected projectId:", firebaseProjectId,
          "Actual projectId in app.options:", app?.options?.projectId
        );
        firebaseAppWasInitialized = false;
      }
    } catch (error: any) {
      console.error("Firebase Core App Initialization CATCH BLOCK Error:", error.message || error, "Code:", error.code || 'N/A');
      firebaseAppWasInitialized = false;
    }
  } else {
    app = getApps()[0];
    console.log("Existing Firebase App instance reused. App name:", app.name);
     if (app && app.name && typeof app.options === 'object' && app.options.projectId === firebaseProjectId) {
        firebaseAppWasInitialized = true;
    } else {
        console.warn("Existing Firebase App instance appears invalid or incomplete. App object:", app, "Expected projectId:", firebaseProjectId);
        firebaseAppWasInitialized = false;
    }
  }

  if (firebaseAppWasInitialized && app && app.options?.projectId) {
    console.log("Firebase App seems initialized correctly. Proceeding to initialize Auth, Firestore, Storage...");
    try {
      authInstance = getAuth(app);
      console.log("Firebase Auth service initialized.");
    } catch (e: any) {
      console.error("Firebase Auth Initialization Error:", e.message || e, "Code:", e.code || 'N/A');
    }

    try {
      console.log("Attempting to initialize Firestore... Firebase App Name:", app.name, "App Options (PROJECT_ID check):", app.options?.projectId);
      console.log("App object being passed to getFirestore:", JSON.parse(JSON.stringify(app))); // Log a serializable version of app
      dbInstance = getFirestore(app);
      console.log("Raw dbInstance object returned by getFirestore():", JSON.parse(JSON.stringify(dbInstance))); // Log a serializable version

      if (dbInstance && typeof dbInstance.collection === 'function' && (dbInstance as any).app?.options?.projectId === app.options.projectId) {
        console.log("Firebase Firestore service initialized SUCCESSFULLY. Project ID from Firestore instance:", (dbInstance as any).app.options.projectId);
        firestoreWasInitialized = true;
      } else {
        console.error("Firebase Firestore Initialization WARNING: getFirestore() did not return a valid Firestore instance. dbInstance:", dbInstance);
        console.error("This usually means the Firebase App object passed to getFirestore() was not fully initialized (check API_KEY, PROJECT_ID in .env.local) OR Firestore service is not enabled/created in your Firebase project console.");
        console.error("Current Firebase App object state when getFirestore failed:", JSON.parse(JSON.stringify(app)));
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
    console.error("Firebase app object is NOT available or valid AFTER initialization attempt, despite initial config seeming valid. Firebase services (Auth, Firestore, Storage) will not be initialized. This STRONGLY indicates an issue with your core Firebase config in .env.local (API_KEY, PROJECT_ID, etc.).");
    firebaseAppWasInitialized = false;
    firestoreWasInitialized = false;
  }
} else {
    console.warn("Firebase initialization was SKIPPED due to invalid configuration (`firebaseConfigIsValid` is false). Check .env.local and previous logs.");
}

if (!firebaseConfigIsValid || !firebaseAppWasInitialized || !firestoreWasInitialized) {
  const CRITICAL_ERROR_MESSAGE = `
  **************************************************************************************************************************************************
  *                                                                                                                                                *
  *   🔥🔥🔥 CRITICAL FIREBASE INITIALIZATION FAILURE (ESPECIALLY FIRESTORE) 🔥🔥🔥                                                              *
  *                                                                                                                                                *
  *   One or more core Firebase services (App, Auth, or Firestore) could NOT be initialized correctly.                                             *
  *   This is EXTREMELY LIKELY due to ONE OR MORE of the following:                                                                                  *
  *     1. **MISSING/INCORRECT ENVIRONMENT VARIABLES in '.env.local'**:                                                                              *
  *        - VERIFY **NEXT_PUBLIC_FIREBASE_API_KEY** (must be exact from Firebase console).                                                         *
  *        - VERIFY **NEXT_PUBLIC_FIREBASE_PROJECT_ID** (must be exact, e.g., 'ekonova-rhw4z').                                                      *
  *        - VERIFY **NEXT_PUBLIC_FIREBASE_DATABASE_URL** (e.g., 'https://ekonova-rhw4z.firebaseio.com' or 'https://ekonova-rhw4z.europe-west1.firebasedatabase.app'). *
  *        - Other \`NEXT_PUBLIC_FIREBASE_...\` variables must also be correct.                                                                       *
  *        - **YOU MUST RESTART YOUR NEXT.JS SERVER (Ctrl+C, then 'npm run dev') AFTER ANY CHANGES TO '.env.local'.**                              *
  *                                                                                                                                                *
  *     2. **FIRESTORE DATABASE NOT CREATED OR ENABLED IN FIREBASE CONSOLE**:                                                                        *
  *        - Go to your Firebase Project (${firebaseConfig.projectId || 'UNKNOWN_PROJECT_ID'}) -> Firestore Database.                                               *
  *        - If it says "Create database", **YOU MUST CLICK IT AND CREATE THE DATABASE**. Choose a region and mode.                                   *
  *                                                                                                                                                *
  *     3. **INCORRECT FIRESTORE REGION / DATABASE_URL**:                                                                                            *
  *        - If your Firestore database is in a specific region, your \`DATABASE_URL\` in \`.env.local\` MUST reflect this.                          *
  *                                                                                                                                                *
  *   >>> REVIEW CONSOLE LOGS ABOVE THIS MESSAGE CAREFULLY:                                                                                          *
  *       - Look for "Firebase Configuration Check START/END" to see what values are being used from .env.local.                                     *
  *       - Look for "Firebase Core App Initialization WARNING", "Firebase Auth Initialization Error", or "Firebase Firestore Initialization WARNING/Error". *
  *                                                                                                                                                *
  *   >>> CURRENT INITIALIZATION STATUS FLAGS (as determined by this file):                                                                          *
  *       - firebaseConfigIsValid:   ${firebaseConfigIsValid}  (Must be true. If false, check .env.local variables as logged above.)                       *
  *       - firebaseAppWasInitialized: ${firebaseAppWasInitialized} (Must be true. If false, core Firebase app did not start. Check API_KEY & PROJECT_ID!) *
  *       - firestoreWasInitialized: ${firestoreWasInitialized} (MUST BE TRUE for database operations. Currently FALSE if this message is prominent.)    *
  *                                                                                                                                                *
  *   Your app WILL NOT function correctly regarding data storage or authentication until all these services are properly initialized.               *
  *   "Client is offline" errors are a direct symptom of Firestore not being initialized correctly.                                                  *
  *                                                                                                                                                *
  **************************************************************************************************************************************************
  `;
  console.error(CRITICAL_ERROR_MESSAGE);
  // Ensure dbInstance is an empty object if Firestore failed to initialize, to prevent undefined errors elsewhere.
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
console.log(`Exporting db object. Is it a valid Firestore instance (should have a .collection method)? ${dbInstance && typeof dbInstance.collection === 'function'}`);
console.log(`Type of dbInstance: ${typeof dbInstance}, Is dbInstance an empty object? ${Object.keys(dbInstance).length === 0 && dbInstance.constructor === Object}`);
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
