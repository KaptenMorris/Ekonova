
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage'; // If you plan to use Firebase Storage for images

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // If using storage

// --- Emulator Setup (Optional - for local development) ---
// IMPORTANT: Ensure emulators are running before uncommenting these lines.
// To use emulators:
// 1. Install Firebase CLI: `npm install -g firebase-tools`
// 2. Login: `firebase login`
// 3. Initialize emulators in your project root: `firebase init emulators` (select Auth, Firestore, Storage)
// 4. Start emulators: `firebase emulators:start`
//
// Then, uncomment these lines when running your Next.js dev server locally.
// DO NOT deploy with emulators connected in production.

// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
//   // Check if already connected to avoid re-connecting on HMR
//   // NOTE: Firebase JS SDK v9+ has an issue where `auth.emulatorConfig` is null even when connected.
//   // A common workaround is to use a flag or check a known emulator port.
//   // For simplicity, we'll assume if window is defined and in dev, connect if not already.
//   // This might need a more robust check in complex scenarios.
//   try {
//     if (auth.config.emulator?.host !== 'localhost:9099') { // Crude check
//        console.log("Connecting to Firebase Auth Emulator");
//        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//     }
//     if ((db as any)._settings?.host !== 'localhost:8080') { // Crude check for Firestore
//        console.log("Connecting to Firebase Firestore Emulator");
//        connectFirestoreEmulator(db, 'localhost', 8080);
//     }
//     // if ((storage as any)._service?.host !== 'localhost:9199') { // Crude check for Storage
//     //   console.log("Connecting to Firebase Storage Emulator");
//     //   connectStorageEmulator(storage, 'localhost', 9199);
//     // }
//   } catch (error) {
//     console.warn("Error connecting to Firebase Emulators (they might not be running):", error);
//   }
// }


export { app, auth, db, storage }; // Export storage if used
