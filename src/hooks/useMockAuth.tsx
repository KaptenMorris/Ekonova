
"use client";

import type { ReactNode} from 'react';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updatePassword,
  deleteUser as firebaseDeleteUser,
  updateProfile,
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseConfigIsValid } from '@/lib/firebase'; // Import firebaseConfigIsValid
import { useToast } from './use-toast';
import type { UserProfile } from '@/types';

interface LoginResult {
  success: boolean;
  errorKey?: 'invalid_credentials' | 'account_not_verified' | 'config_error' | 'generic_error' | 'user-disabled' | 'too-many-requests';
}

interface SignupResult {
  success: boolean;
  messageKey?: 'verification_sent' | 'already_registered' | 'config_error' | 'generic_error';
}

interface ChangePasswordResult {
  success: boolean;
  errorKey?: 'config_error' | 'generic_error' | 'reauth_required';
}

interface UpdateProfilePictureResult {
  success: boolean;
  errorKey?: 'config_error' | 'generic_error' | 'storage_error';
}

interface UpdateUserPreferencesResult {
  success: boolean;
  errorKey?: 'config_error' | 'generic_error' | 'not_found';
}


interface AuthContextType {
  isAuthenticated: boolean;
  currentUserEmail: string | null;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
  currentUserProfile: UserProfile | null;
  userId: string | null;
  login: (email?: string, password?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  signup: (email?: string, password?: string, name?: string) => Promise<SignupResult>;
  signInWithGoogle: () => Promise<LoginResult>;
  deleteAccount: () => Promise<void>;
  changePassword: (newPassword?: string) => Promise<ChangePasswordResult>;
  updateProfilePicture: (imageDataUri: string) => Promise<UpdateProfilePictureResult>;
  updateUserPreferences: (preferences: Partial<Pick<UserProfile, 'showBillsSection'>>) => Promise<UpdateUserPreferencesResult>;
  isLoading: boolean;
  resendVerification: () => Promise<{ success: boolean; errorKey?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    if (!firebaseConfigIsValid) {
      console.error("CRITICAL: Firebase configuration is invalid (firebaseConfigIsValid is false in fetchUserProfile). Firestore operations like fetchUserProfile will fail. Check console logs from 'src/lib/firebase.ts' for details on missing/incorrect environment variables.");
      setUserProfile(null); // Ensure profile is cleared if config is bad
      return null;
    }
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0 && !(db instanceof Timestamp))) {
      console.error("CRITICAL: Firestore 'db' instance is not available or not properly initialized in fetchUserProfile. Aborting. This usually means Firebase failed to initialize correctly in 'src/lib/firebase.ts'. Check previous logs.");
      setUserProfile(null); // Ensure profile is cleared
      return null;
    }

    console.log(`fetchUserProfile called for UID: ${uid}. firebaseConfigIsValid: ${firebaseConfigIsValid}`);
    if (!uid) {
      console.warn("fetchUserProfile called with no UID. Aborting.");
      setUserProfile(null);
      return null;
    }

    const userDocRef = doc(db, 'users', uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        const fetchedProfile = {
          uid: uid,
          email: profileData.email || null,
          name: profileData.name || null,
          avatarUrl: profileData.avatarUrl || null,
          createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt.toDate().toISOString() : profileData.createdAt,
          showBillsSection: typeof profileData.showBillsSection === 'boolean' ? profileData.showBillsSection : true,
        } as UserProfile;
        setUserProfile(fetchedProfile);
        return fetchedProfile;
      }
      console.warn(`User profile not found in Firestore for UID: ${uid}. A new one might be created if this is a new user.`);
      setUserProfile(null);
      return null;
    } catch (e: any) {
      console.error("Error fetching user profile from Firestore:", e);
        if (e instanceof Error) {
            if (e.name === 'FirebaseError' && ( (e as any).code === 'unavailable' || (e as any).code === 'cancelled' || e.message.toLowerCase().includes('offline') || e.message.toLowerCase().includes('failed to get document because the client is offline') ) ) {
                console.error(`Firestore fetchUserProfile network/offline error: ${e.message}. Check Firestore status and network connection.`);
                console.error("ADDITIONAL DEBUG: This 'client is offline' error almost ALWAYS means your Firebase configuration in '.env.local' (NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_DATABASE_URL) is incorrect or Firestore is not properly enabled in your Firebase project. PLEASE REVIEW THE INITIALIZATION LOGS FROM 'src/lib/firebase.ts' IN YOUR CONSOLE.");
            } else if ((e as any).code === 0 || e.message.toLowerCase().includes('failed to fetch')) { 
               console.error(`Firestore fetchUserProfile network/CORS error: ${e.message}. Check Firebase platform settings (CORS), network connection, and browser's network tab for more details.`);
            } else {
               console.error(`Firestore fetchUserProfile error (Code: ${(e as any).code}): ${e.message}.`);
            }
        } else {
            console.error("An unknown error occurred while fetching user profile:", e);
        }
      setUserProfile(null);
      return null;
    }
  }, [toast]); // Removed setUserProfile from dependencies as it causes infinite loops if fetchUserProfile itself calls it. fetchUserProfile should return data, and caller manages state.


  const ensureUserProfileExists = useCallback(async (user: FirebaseUser, isNewGoogleUser: boolean = false) => {
     if (!firebaseConfigIsValid) {
      console.error("CRITICAL: Firebase configuration is invalid (firebaseConfigIsValid is false in ensureUserProfileExists). Cannot ensure user profile exists. Check console logs from 'src/lib/firebase.ts'.");
      toast({
        title: "Profilfel",
        description: "Kunde inte skapa eller ladda användarprofil på grund av konfigurationsfel.",
        variant: "destructive",
        duration: 7000,
      });
      return;
    }
    if (!db || (typeof db === 'object' && Object.keys(db).length === 0 && !(db instanceof Timestamp))) {
      console.error("CRITICAL: Firestore 'db' instance is not available in ensureUserProfileExists. Cannot ensure user profile. Check initialization in 'src/lib/firebase.ts'.");
      toast({ title: "Databasfel", description: "Kunde inte ansluta till databasen för att hantera användarprofil.", variant: "destructive", duration: 7000 });
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    let profileToSet: UserProfile | null = null;
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        profileToSet = {
          uid: user.uid,
          email: profileData.email || user.email,
          name: profileData.name || user.displayName,
          avatarUrl: profileData.avatarUrl || user.photoURL,
          createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt.toDate().toISOString() : profileData.createdAt,
          showBillsSection: typeof profileData.showBillsSection === 'boolean' ? profileData.showBillsSection : true,
        };
      } else {
        const newProfileData: UserProfile = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || (isNewGoogleUser && user.email ? user.email.split('@')[0] : 'Ny Användare'),
          avatarUrl: user.photoURL,
          createdAt: serverTimestamp(), // This will be a server timestamp object
          showBillsSection: true,
        };
        await setDoc(userDocRef, newProfileData);
        // For immediate state update, convert serverTimestamp to a client-side representation
        // However, onAuthStateChanged will re-trigger fetchUserProfile which is better.
        // For now, let's set a placeholder or rely on fetchUserProfile.
        profileToSet = { ...newProfileData, createdAt: new Date().toISOString() };
      }
      setUserProfile(profileToSet); // Update local state
    } catch (error) {
      console.error("Error fetching/creating user profile in Firestore (ensureUserProfileExists):", error);
      if (error instanceof Error && error.message.toLowerCase().includes("client is offline")) {
          console.error("ADDITIONAL DEBUG: 'client is offline' during ensureUserProfileExists. This points to fundamental Firebase config issues. Check '.env.local' (PROJECT_ID, DATABASE_URL) and Firestore setup in Firebase console. Review 'src/lib/firebase.ts' logs.");
      }
      toast({ title: "Profilfel", description: "Kunde inte ladda eller skapa användarprofil.", variant: "destructive" });
      setUserProfile(null);
    }
  }, [toast]); // Removed setUserProfile for the same reason as fetchUserProfile


  useEffect(() => {
    console.log("Auth Provider: useEffect for onAuthStateChanged running. firebaseConfigIsValid:", firebaseConfigIsValid);
    if (!firebaseConfigIsValid) {
      setIsLoading(false);
      setFirebaseUser(null);
      setUserProfile(null);
      console.warn("Firebase configuration is invalid (firebaseConfigIsValid is false in onAuthStateChanged effect). Auth services will not function effectively. User will appear logged out. Check console logs from 'src/lib/firebase.ts' for details.");
      return; // Stop further auth processing if config is bad
    }

    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth Provider: onAuthStateChanged triggered. User:", user ? user.uid : null, "Email Verified:", user ? user.emailVerified : null);
      setFirebaseUser(user);
      if (user) {
        if (user.emailVerified) {
          console.log("Auth Provider: User email IS verified. Attempting to fetch/ensure profile for UID:", user.uid);
          const profile = await fetchUserProfile(user.uid); // fetchUserProfile now sets userProfile state
          if (!profile) {
            console.log("Auth Provider: No existing profile found by fetchUserProfile, attempting to ensure profile exists for UID:", user.uid);
            await ensureUserProfileExists(user); // ensureUserProfileExists also sets userProfile state
          }
        } else {
          console.log(`Auth Provider: User ${user.uid} is authenticated BUT email not verified. userProfile will be null. Waiting for email verification.`);
          setUserProfile(null); // Explicitly set to null if email not verified
        }
      } else {
        console.log("Auth Provider: No user authenticated, userProfile set to null.");
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile, ensureUserProfileExists]); // Dependencies are now other stable callbacks


  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) {
      console.error("Login attempt failed: Firebase configuration is invalid. Check 'src/lib/firebase.ts' logs.");
      return { success: false, errorKey: 'config_error' };
    }
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        // User is technically logged in by Firebase, but email not verified.
        // onAuthStateChanged will set firebaseUser. Let UI handle verification prompt.
        // No explicit signOut here, to allow resend verification.
        setIsLoading(false);
        return { success: false, errorKey: 'account_not_verified' };
      }
      // If email is verified, onAuthStateChanged will handle profile loading.
      setIsLoading(false);
      return { success: true };

    } catch (e: any) {
      setIsLoading(false);
      console.error("Firebase login error:", e);
      let errorKey: LoginResult['errorKey'] = 'generic_error';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        console.warn(`Login attempt failed for email: ${email} with Firebase code: ${e.code} (auth/invalid-credential). This usually means the email doesn't exist or the password was incorrect, or the credential format is invalid.`);
        errorKey = 'invalid_credentials';
      } else if (e.code === 'auth/user-disabled') {
        errorKey = 'user-disabled';
      } else if (e.code === 'auth/too-many-requests') {
        errorKey = 'too-many-requests';
      }
      return { success: false, errorKey };
    }
  }, [toast]); 

  const signInWithGoogle = useCallback(async (): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) {
      console.error("Google Sign-In attempt failed: Firebase configuration is invalid. Check 'src/lib/firebase.ts' logs.");
      return { success: false, errorKey: 'config_error' };
    }
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // If Google sign-in is successful, onAuthStateChanged will be triggered.
      // ensureUserProfileExists (called by onAuthStateChanged) will handle creating/updating the profile in Firestore.
      // Google users are typically auto-verified by Firebase.
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      setIsLoading(false);
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
         toast({
            title: "Google Inloggning Avbruten",
            description: "Inloggningsfönstret stängdes innan processen var klar.",
            variant: "default",
        });
      } else if (error.code === 'auth/account-exists-with-different-credential') {
         toast({
            title: "Konto Finns Redan",
            description: "Ett konto finns redan med denna e-postadress men med en annan inloggningsmetod. Försök logga in med den ursprungliga metoden.",
            variant: "destructive",
            duration: 7000,
        });
      } else {
        toast({
          title: "Google Inloggning Misslyckades",
          description: error.message || "Kunde inte logga in med Google. Försök igen.",
          variant: "destructive",
        });
      }
      return { success: false, errorKey: 'generic_error' };
    }
  }, [toast]); 


  const logout = useCallback(async () => {
    if (!firebaseConfigIsValid) {
        console.error("Logout attempt failed: Firebase configuration is invalid.");
        return;
    }
    setIsLoading(true);
    try {
      const currentUid = firebaseUser?.uid; 
      await signOut(auth);
      if (currentUid && typeof window !== 'undefined') {
         localStorage.removeItem(`ekonova-active-board-id-${currentUid}`);
      }
      // State updates (firebaseUser, userProfile) handled by onAuthStateChanged
      router.push('/login');
      toast({ title: "Utloggad", description: "Du har loggats ut." });
    } catch (e) {
      console.error("Firebase logout error:", e);
      toast({ title: "Utloggning Misslyckades", description: "Kunde inte logga ut. Försök igen.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast, firebaseUser]); 

  const signup = useCallback(async (email?: string, password?: string, name?: string): Promise<SignupResult> => {
    if (!firebaseConfigIsValid) {
        console.error("Signup attempt failed: Firebase configuration is invalid. Check 'src/lib/firebase.ts' logs.");
        return { success: false, messageKey: 'config_error' };
    }
    if (!email || !password || !name) return { success: false, messageKey: 'generic_error' };
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      if (!db || (typeof db === 'object' && Object.keys(db).length === 0 && !(db instanceof Timestamp))) {
        console.error("CRITICAL: Firestore 'db' instance is not available during signup. Cannot create user profile in DB. Check 'src/lib/firebase.ts' initialization.");
        toast({ title: "Profilfel", description: "Kunde inte skapa användarprofil i databasen p.g.a. konfigurationsfel.", variant: "destructive", duration: 7000 });
      } else {
        const userProfileData: UserProfile = {
          uid: user.uid,
          email: user.email,
          name: name,
          avatarUrl: user.photoURL, 
          createdAt: serverTimestamp(),
          showBillsSection: true,
        };
        await setDoc(doc(db, 'users', user.uid), userProfileData);
        // No need to setUserProfile here, onAuthStateChanged will trigger ensureUserProfileExists after verification.
      }

      await sendEmailVerification(user);
      setIsLoading(false);
      return { success: true, messageKey: 'verification_sent' };

    } catch (e: any) {
      setIsLoading(false);
      console.error("Firebase signup error:", e);
      if (e.code === 'auth/email-already-in-use') {
        return { success: false, messageKey: 'already_registered' };
      } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-email' || e.code === 'auth/weak-password') {
        return { success: false, messageKey: 'generic_error' }; 
      }
      return { success: false, messageKey: 'generic_error' };
    }
  }, [toast]);

  const resendVerification = useCallback(async (): Promise<{ success: boolean; errorKey?: string }> => {
    if (!firebaseConfigIsValid) {
        console.error("Resend verification attempt failed: Firebase configuration is invalid.");
        return { success: false, errorKey: 'config_error' };
    }
    
    const currentUser = auth.currentUser; 
    if (currentUser) {
      if (currentUser.emailVerified) {
        toast({ title: "E-post Redan Verifierad", description: "Din e-postadress är redan verifierad.", variant: "default" });
        return { success: true };
      }
      setIsLoading(true);
      try {
        await sendEmailVerification(currentUser);
        setIsLoading(false);
        toast({ title: "Verifieringsmail Skickat", description: "Ett nytt verifieringsmail har skickats." });
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Error resending verification:", e);
        toast({ title: "Fel", description: "Kunde inte skicka verifieringsmail.", variant: "destructive" });
        return { success: false, errorKey: 'generic_error' };
      }
    } else {
      toast({ title: "Ingen Användare", description: "Ingen användare är aktiv för att skicka om verifieringsmail. Försök logga in igen.", variant: "destructive" });
      return { success: false, errorKey: 'generic_error' };
    }
  }, [toast]);

 const deleteRelatedData = async (uidToDelete: string) => {
    if (!firebaseConfigIsValid || !db || (typeof db === 'object' && Object.keys(db).length === 0 && !(db instanceof Timestamp))) {
      console.warn("Firestore db instance not available or Firebase not configured, skipping deletion of related data.");
      toast({ title: "Fel", description: "Kunde inte radera databasdata p.g.a. konfigurationsfel.", variant: "destructive" });
      return false;
    }
    const batch = writeBatch(db);

    try {
      // Delete user's boards
      const boardsQuery = query(collection(db, "boards"), where("userId", "==", uidToDelete));
      const boardsSnapshot = await getDocs(boardsQuery);
      boardsSnapshot.forEach((docSnapshot) => batch.delete(docSnapshot.ref));

      // Delete user's bills
      const billsQuery = query(collection(db, "bills"), where("userId", "==", uidToDelete));
      const billsSnapshot = await getDocs(billsQuery);
      billsSnapshot.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
      
      // Delete user's profile document
      const userProfileDocRef = doc(db, "users", uidToDelete);
      batch.delete(userProfileDocRef);

      await batch.commit();
      console.log(`Successfully deleted Firestore data for user ${uidToDelete}`);
      return true;
    } catch (error) {
      console.error(`Error deleting related Firestore data for user ${uidToDelete}:`, error);
      if (error instanceof Error && error.message.toLowerCase().includes("client is offline")) {
         console.error("ADDITIONAL DEBUG: 'client is offline' during deleteRelatedData. Check Firebase config and initialization in 'src/lib/firebase.ts'.");
      }
      toast({ title: "Fel", description: "Kunde inte radera all tillhörande data från databasen.", variant: "destructive" });
      return false;
    }
  };


  const deleteAccount = useCallback(async () => {
    if (!firebaseConfigIsValid) {
        console.error("Delete account attempt failed: Firebase configuration is invalid.");
        return;
    }
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      const uidToDelete = currentUser.uid;
      setIsLoading(true);
      try {
        // Attempt to delete related Firestore data first
        const dataDeletedSuccessfully = await deleteRelatedData(uidToDelete); 
        if (!dataDeletedSuccessfully) {
           // Log or handle incomplete data deletion if critical, but proceed with auth user deletion
           console.warn("Deletion of related Firestore data failed or was incomplete. Auth user deletion will still be attempted.");
        }
        
        // Then delete the Firebase Auth user
        await firebaseDeleteUser(currentUser);    
        
        // Clear any local storage related to the user
        const activeIdKey = `ekonova-active-board-id-${uidToDelete}`;
        if (typeof window !== 'undefined') localStorage.removeItem(activeIdKey);

        // onAuthStateChanged will handle setting firebaseUser and userProfile to null
        // and redirecting if needed.
        router.push('/login'); // Explicit redirect for immediate UI update
        toast({ title: "Konto Raderat", description: "Ditt konto och all tillhörande data har raderats permanent." });
      } catch (e: any) {
        console.error("Firebase delete account error:", e);
        if (e.code === 'auth/requires-recent-login') {
          toast({ title: "Återautentisering Krävs", description: "Logga in igen och försök sedan radera kontot.", variant: "destructive" });
        } else {
          toast({ title: "Fel Vid Radering", description: "Kunde inte radera konto. Försök igen.", variant: "destructive" });
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({ title: "Fel", description: "Ingen användare inloggad för att radera.", variant: "destructive" });
    }
  }, [router, toast]); // Removed firebaseUser from dependencies, auth.currentUser is used instead.

  const changePassword = useCallback(async (newPassword?: string): Promise<ChangePasswordResult> => {
    if (!firebaseConfigIsValid) {
        console.error("Change password attempt failed: Firebase configuration is invalid.");
        return { success: false, errorKey: 'config_error' };
    }
    if (!newPassword) return { success: false, errorKey: 'generic_error' }; 
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      setIsLoading(true);
      try {
        await updatePassword(currentUser, newPassword);
        setIsLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase change password error:", e);
        if (e.code === 'auth/requires-recent-login') {
          return { success: false, errorKey: 'reauth_required' };
        }
        return { success: false, errorKey: 'generic_error' };
      }
    } else {
      setIsLoading(false);
      return { success: false, errorKey: 'generic_error' }; 
    }
  }, []);

  const updateProfilePicture = useCallback(async (imageDataUri: string): Promise<UpdateProfilePictureResult> => {
    if (!firebaseConfigIsValid) {
        console.error("Update profile picture attempt failed: Firebase configuration is invalid.");
        return { success: false, errorKey: 'config_error' };
    }
    
    const currentUser = auth.currentUser;
    if (currentUser) {
       if (!db || (typeof db === 'object' && Object.keys(db).length === 0 && !(db instanceof Timestamp))) {
         console.error("CRITICAL: Firestore 'db' instance is not available when updating profile picture. Cannot update profile picture in DB. Check 'src/lib/firebase.ts' initialization.");
         toast({ title: "Profilfel", description: "Kunde inte spara profilbild i databasen p.g.a. konfigurationsfel.", variant: "destructive", duration: 7000 });
         return { success: false, errorKey: 'config_error' };
       }
      setIsLoading(true);
      try {
        // Update in Firebase Auth
        await updateProfile(currentUser, { photoURL: imageDataUri });
        
        // Update in Firestore 'users' collection
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { avatarUrl: imageDataUri }, { merge: true });

        // Update local state
        setUserProfile(prev => prev ? { ...prev, avatarUrl: imageDataUri } : null);
        // FirebaseUser state (firebaseUser) will be updated by onAuthStateChanged if photoURL actually changes in Firebase Auth
        // but we can force a re-read or update it manually if needed, though usually not necessary.
        // setFirebaseUser(auth.currentUser); // This might be redundant if onAuthStateChanged handles it

        setIsLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase update profile picture error:", e);
        if (e instanceof Error && e.message.toLowerCase().includes("client is offline")) {
          console.error("ADDITIONAL DEBUG: 'client is offline' during updateProfilePicture. Check Firebase config and initialization in 'src/lib/firebase.ts'.");
        }
        return { success: false, errorKey: 'generic_error' }; 
      }
    } else {
      setIsLoading(false);
      return { success: false, errorKey: 'generic_error' }; 
    }
  }, [toast]); // Removed setUserProfile from dependencies.

  const updateUserPreferences = useCallback(async (preferences: Partial<Pick<UserProfile, 'showBillsSection'>>): Promise<UpdateUserPreferencesResult> => {
    if (!firebaseConfigIsValid) {
        console.error("Update user preferences attempt failed: Firebase configuration is invalid.");
        return { success: false, errorKey: 'config_error' };
    }
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      if (!db || (typeof db === 'object' && Object.keys(db).length === 0 && !(db instanceof Timestamp))) {
        console.error("CRITICAL: Firestore 'db' instance is not available when updating user preferences. Cannot update preferences. Check 'src/lib/firebase.ts' initialization.");
        toast({ title: "Inställningsfel", description: "Kunde inte spara inställningar p.g.a. konfigurationsfel.", variant: "destructive", duration: 7000 });
        return { success: false, errorKey: 'config_error' };
      }
      setIsLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await setDoc(userDocRef, preferences, { merge: true });
        setUserProfile(prev => prev ? { ...prev, ...preferences } : null); // Update local state
        setIsLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase update user preferences error:", e);
        if (e instanceof Error && e.message.toLowerCase().includes("client is offline")) {
          console.error("ADDITIONAL DEBUG: 'client is offline' during updateUserPreferences. Check Firebase config and initialization in 'src/lib/firebase.ts'.");
        }
        return { success: false, errorKey: 'generic_error' };
      }
    } else {
      return { success: false, errorKey: 'not_found' };
    }
  }, [toast]); // Removed setUserProfile from dependencies.
  
  // isAuthenticated is true only if Firebase config is valid AND user is authenticated AND email is verified.
  const isAuthenticatedResult = firebaseConfigIsValid && !!firebaseUser && !!firebaseUser.emailVerified;

  return (
    <AuthContext.Provider value={{
      isAuthenticated: isAuthenticatedResult,
      currentUserEmail: firebaseUser?.email || null,
      currentUserName: userProfile?.name || firebaseUser?.displayName || null,
      currentUserAvatarUrl: userProfile?.avatarUrl || firebaseUser?.photoURL || null,
      currentUserProfile: userProfile,
      userId: firebaseUser?.uid || null,
      login,
      logout,
      signup,
      signInWithGoogle,
      deleteAccount,
      changePassword,
      updateProfilePicture,
      updateUserPreferences,
      resendVerification,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth måste användas inom en AuthProvider');
  }
  return context;
}

