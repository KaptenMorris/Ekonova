
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // connectAuthEmulator borttagen för enkelhet
import { getFirestore } from 'firebase/firestore'; // connectFirestoreEmulator borttagen
import { getStorage } from 'firebase/storage'; // connectStorageEmulator borttagen

// Hämta miljövariabler
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Valfri
const firebaseDatabaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL; // Viktig för vissa konfigurationer

// Definiera vilka miljövariabler som är absolut nödvändiga
const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseAppId,
  // NEXT_PUBLIC_FIREBASE_DATABASE_URL är viktig för Realtime Database och kan vara det för Firestore.
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: firebaseDatabaseURL
};

let firebaseConfigIsValid = true;
console.log("--- Firebase Configuration Check ---");
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.startsWith('YOUR_') || value.startsWith('PASTE_') || value.includes('your-project-id') || value.includes('your-api-key') || value.includes('your-database-url')) {
    console.error(
      `Firebase Configuration Error: Miljövariabeln ${key} är inte satt eller är fortfarande en platshållare. Uppdatera den i din .env.local-fil och starta om Next.js utvecklingsserver.`
    );
    firebaseConfigIsValid = false;
  } else {
    // Logga inte API-nyckeln av säkerhetsskäl
    if (key !== 'NEXT_PUBLIC_FIREBASE_API_KEY') {
      console.log(`Miljövariabel ${key}: ${value}`);
    } else {
      console.log(`Miljövariabel ${key}: ****** (korrekt satt)`);
    }
  }
}
console.log("------------------------------------");


if (!firebaseDatabaseURL) {
    console.warn(
      `Firebase Configuration Varning: NEXT_PUBLIC_FIREBASE_DATABASE_URL är inte satt. Detta krävs oftast för Realtime Database och kan vara viktigt för Firestore i specifika regioner. Om du stöter på problem, se till att detta är korrekt inställt till ditt projekts databas-URL (t.ex. https://<DITT_PROJEKT_ID>.firebaseio.com eller https://<DITT_PROJEKT_ID>.europe-west1.firebasedatabase.app).`
    );
}

if (!firebaseConfigIsValid) {
  console.error("Firebase-initiering kommer att försökas men kan misslyckas eller leda till 'offline'-fel på grund av saknade eller platshållarvärden i miljövariabler. Appens funktionalitet som förlitar sig på Firebase kommer att påverkas. Se till att alla NEXT_PUBLIC_FIREBASE_... variabler är korrekt inställda i .env.local och att servern har startats om.");
}

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
let authInstance: any = {};
let dbInstance: any = {};
let storageInstance: any = {};

if (firebaseConfigIsValid) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase App initialiserad framgångsrikt.");
    } catch (error: any) {
      console.error("Firebase Core App Initialiseringsfel:", error.message || error);
      firebaseConfigIsValid = false;
    }
  } else {
    app = getApps()[0];
    console.log("Befintlig Firebase App-instans återanvänds.");
  }

  if (firebaseConfigIsValid && app && Object.keys(app).length > 0 && app.name) {
    try {
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        storageInstance = getStorage(app);
        console.log("Firebase Auth, Firestore och Storage SDK-tjänster initialiserade.");
    } catch (sdkError: any) {
        console.error("Firebase SDK Service (Auth, Firestore, Storage) Initialiseringsfel:", sdkError.message || sdkError);
        firebaseConfigIsValid = false;
    }
  } else if (firebaseConfigIsValid) {
    console.error("Firebase app-objekt är inte tillgängligt efter försök till initialisering, trots att konfigurationen verkade giltig. SDK-tjänster kommer inte att initialiseras.");
    firebaseConfigIsValid = false;
  }
}

if (!firebaseConfigIsValid) {
  console.warn("Firebase SDK:er (auth, db, storage) är inte korrekt initialiserade på grund av konfigurations- eller initialiseringsfel. Kontrollera din .env.local-fil, Firebase-projektinställningar och starta om servern. Applikationens funktionalitet som förlitar sig på Firebase kommer att påverkas.");
  authInstance = authInstance || {};
  dbInstance = dbInstance || {};
  storageInstance = storageInstance || {};
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage, firebaseConfigIsValid };
