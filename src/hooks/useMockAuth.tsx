
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
    if (!firebaseConfigIsValid || !db || Object.keys(db).length === 0) {
      console.error("Firestore is not available due to invalid Firebase configuration. Aborting fetchUserProfile.");
      // Removed toast from here to avoid spamming if this is called frequently during bad config
      return null;
    }
    const userDocRef = doc(db, 'users', uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        return {
          uid: uid,
          email: profileData.email || null,
          name: profileData.name || null,
          avatarUrl: profileData.avatarUrl || null,
          createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt.toDate().toISOString() : profileData.createdAt,
          showBillsSection: typeof profileData.showBillsSection === 'boolean' ? profileData.showBillsSection : true,
        } as UserProfile;
      }
      console.warn(`User profile not found in Firestore for UID: ${uid}. A new one might be created if this is a new user.`);
      return null;
    } catch (e: any) {
      console.error("Error fetching user profile from Firestore:", e);
        if (e instanceof Error) {
            if (e.name === 'FirebaseError' && ( (e as any).code === 'unavailable' || (e as any).code === 'cancelled' || e.message.toLowerCase().includes('offline') || e.message.toLowerCase().includes('failed to get document because the client is offline') ) ) {
                console.error(`Firestore fetchUserProfile network/offline error: ${e.message}. Check Firestore status and network connection.`);
            } else if ((e as any).code === 0 || e.message.toLowerCase().includes('failed to fetch')) { 
               console.error(`Firestore fetchUserProfile network/CORS error: ${e.message}. Check Firebase platform settings (CORS), network connection, and browser's network tab for more details.`);
            } else {
               console.error(`Firestore fetchUserProfile error (Code: ${(e as any).code}): ${e.message}.`);
            }
        } else {
            console.error("An unknown error occurred while fetching user profile:", e);
        }
      return null;
    }
  }, [toast]); // Added toast to dependency array


  const ensureUserProfileExists = useCallback(async (user: FirebaseUser, isNewGoogleUser: boolean = false) => {
     if (!firebaseConfigIsValid || !db || Object.keys(db).length === 0) {
      console.error("Firestore is not available due to invalid Firebase configuration. Aborting ensureUserProfileExists.");
      toast({
        title: "Profilfel",
        description: "Kunde inte skapa eller ladda användarprofil på grund av konfigurationsfel.",
        variant: "destructive",
        duration: 7000,
      });
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
          createdAt: serverTimestamp(), // Use serverTimestamp for new profiles
          showBillsSection: true,
        };
        await setDoc(userDocRef, newProfileData);
        // For createdAt, if we use serverTimestamp, we won't have the exact value client-side immediately.
        // We can either refetch or use an optimistic local date.
        profileToSet = { ...newProfileData, createdAt: new Date().toISOString() };
      }
      setUserProfile(profileToSet);
    } catch (error) {
      console.error("Error fetching/creating user profile in Firestore:", error);
      toast({ title: "Profilfel", description: "Kunde inte ladda eller skapa användarprofil.", variant: "destructive" });
      setUserProfile(null);
    }
  }, [toast]);


  useEffect(() => {
    if (!firebaseConfigIsValid) {
      setIsLoading(false);
      console.warn("Firebase configuration is invalid. Auth services will not function effectively.");
      // No toast here, firebase.ts handles the critical console error.
      return;
    }

    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        if (user.emailVerified) { // Only fetch/ensure profile if email is verified
          const existingProfile = await fetchUserProfile(user.uid);
          if (existingProfile) {
            setUserProfile(existingProfile);
          } else {
            await ensureUserProfileExists(user);
          }
        } else {
          // User exists but email not verified.
          // Set userProfile to null or a minimal unverified profile if needed by UI.
          setUserProfile(null); 
          console.log(`User ${user.uid} is authenticated but email not verified. Profile not fully loaded.`);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile, ensureUserProfileExists]); // Removed firebaseConfigIsValid from deps as it's module-level const


  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        // User is technically logged in by Firebase, but email not verified.
        // onAuthStateChanged will set firebaseUser. Let UI handle verification prompt.
        // No explicit logout here, allows resendVerification to work.
        setIsLoading(false);
        return { success: false, errorKey: 'account_not_verified' };
      }
      // If email is verified, onAuthStateChanged would have called ensureUserProfileExists and set userProfile.
      // Potentially trigger a profile fetch here if onAuthStateChanged hasn't fully completed its async work.
      if (userCredential.user.uid && !userProfile) {
         await fetchUserProfile(userCredential.user.uid).then(setUserProfile);
      }
      setIsLoading(false);
      return { success: true };

    } catch (e: any) {
      setIsLoading(false);
      console.error("Firebase login error:", e);
      let errorKey: LoginResult['errorKey'] = 'generic_error';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        console.warn(`Login attempt failed for email: ${email} with Firebase code: ${e.code}. This usually means the email doesn't exist or the password was incorrect, or the credential format is invalid.`);
        errorKey = 'invalid_credentials';
      } else if (e.code === 'auth/user-disabled') {
        errorKey = 'user-disabled';
      } else if (e.code === 'auth/too-many-requests') {
        errorKey = 'too-many-requests';
      }
      return { success: false, errorKey };
    }
  }, [fetchUserProfile, userProfile]); 

  const signInWithGoogle = useCallback(async (): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting firebaseUser and calling ensureUserProfileExists.
      // Google users are typically auto-verified.
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
  }, [toast, ensureUserProfileExists]);


  const logout = useCallback(async () => {
    if (!firebaseConfigIsValid) return;
    setIsLoading(true);
    try {
      const currentUid = firebaseUser?.uid; 
      await signOut(auth);
      // State updates (firebaseUser, userProfile) handled by onAuthStateChanged
      if (currentUid && typeof window !== 'undefined') {
         localStorage.removeItem(`ekonova-active-board-id-${currentUid}`);
      }
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
    if (!firebaseConfigIsValid) return { success: false, messageKey: 'config_error' };
    if (!email || !password || !name) return { success: false, messageKey: 'generic_error' };
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      if (!firebaseConfigIsValid || !db || Object.keys(db).length === 0) { // Check db before use
        console.error("Firestore is not available due to invalid Firebase configuration. Cannot create user profile in DB.");
        toast({ title: "Profilfel", description: "Kunde inte skapa användarprofil i databasen på grund av konfigurationsfel.", variant: "destructive", duration: 7000 });
        // Proceed with email verification even if DB profile creation fails for now
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
        // Optimistic update for local state - createdAt will be an estimate.
        setUserProfile({ ...userProfileData, createdAt: new Date().toISOString()});
      }

      await sendEmailVerification(user);
      setIsLoading(false);
      return { success: true, messageKey: 'verification_sent' };

    } catch (e: any) {
      setIsLoading(false);
      console.error("Firebase signup error:", e);
      if (e.code === 'auth/email-already-in-use') {
        return { success: false, messageKey: 'already_registered' };
      }
      return { success: false, messageKey: 'generic_error' };
    }
  }, [toast]);

  const resendVerification = useCallback(async (): Promise<{ success: boolean; errorKey?: string }> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    
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
    if (!firebaseConfigIsValid || !db || Object.keys(db).length === 0) {
      console.warn("Firestore db instance not available or Firebase not configured, skipping deletion of related data.");
      toast({ title: "Fel", description: "Kunde inte radera databasdata p.g.a. konfigurationsfel.", variant: "destructive" });
      return false; // Indicate failure
    }
    const batch = writeBatch(db);

    try {
      const boardsQuery = query(collection(db, "boards"), where("userId", "==", uidToDelete));
      const boardsSnapshot = await getDocs(boardsQuery);
      boardsSnapshot.forEach((docSnapshot) => batch.delete(docSnapshot.ref));

      const billsQuery = query(collection(db, "bills"), where("userId", "==", uidToDelete));
      const billsSnapshot = await getDocs(billsQuery);
      billsSnapshot.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
      
      const userProfileDocRef = doc(db, "users", uidToDelete);
      batch.delete(userProfileDocRef);

      await batch.commit();
      return true; // Indicate success
    } catch (error) {
      console.error("Error deleting related Firestore data:", error);
      toast({ title: "Fel", description: "Kunde inte radera all tillhörande data från databasen.", variant: "destructive" });
      return false; // Indicate failure
    }
  };


  const deleteAccount = useCallback(async () => {
    if (!firebaseConfigIsValid) return;
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      const uidToDelete = currentUser.uid;
      setIsLoading(true);
      try {
        const dataDeletedSuccessfully = await deleteRelatedData(uidToDelete); 
        if (!dataDeletedSuccessfully) {
           // Optionally, decide if you want to proceed with auth user deletion if DB deletion fails.
           // For now, we'll proceed but the user might have orphaned data if this part fails.
           console.warn("Deletion of related Firestore data failed or was incomplete. Auth user deletion will still be attempted.");
        }
        
        await firebaseDeleteUser(currentUser);    
        
        const activeIdKey = `ekonova-active-board-id-${uidToDelete}`;
        if (typeof window !== 'undefined') localStorage.removeItem(activeIdKey);

        router.push('/login'); 
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
  }, [router, toast]);

  const changePassword = useCallback(async (newPassword?: string): Promise<ChangePasswordResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
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
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    
    const currentUser = auth.currentUser;
    if (currentUser) {
       if (!db || Object.keys(db).length === 0) { // Check db before use
         console.error("Firestore is not available due to invalid Firebase configuration. Cannot update profile picture in DB.");
         toast({ title: "Profilfel", description: "Kunde inte spara profilbild i databasen p.g.a. konfigurationsfel.", variant: "destructive", duration: 7000 });
         return { success: false, errorKey: 'config_error' };
       }
      setIsLoading(true);
      try {
        // Update in Firebase Auth (if photoURL is the intended use)
        await updateProfile(currentUser, { photoURL: imageDataUri });
        
        // Update in Firestore 'users' collection
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { avatarUrl: imageDataUri }, { merge: true });

        // Optimistically update local state
        setUserProfile(prev => prev ? { ...prev, avatarUrl: imageDataUri } : null);
        setFirebaseUser(auth.currentUser); // Refresh firebaseUser state which might hold old photoURL

        setIsLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase update profile picture error:", e);
        return { success: false, errorKey: 'generic_error' }; 
      }
    } else {
      setIsLoading(false);
      return { success: false, errorKey: 'generic_error' }; 
    }
  }, [toast]); // Added toast

  const updateUserPreferences = useCallback(async (preferences: Partial<Pick<UserProfile, 'showBillsSection'>>): Promise<UpdateUserPreferencesResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      if (!db || Object.keys(db).length === 0) { // Check db before use
        console.error("Firestore is not available due to invalid Firebase configuration. Cannot update user preferences.");
        toast({ title: "Inställningsfel", description: "Kunde inte spara inställningar p.g.a. konfigurationsfel.", variant: "destructive", duration: 7000 });
        return { success: false, errorKey: 'config_error' };
      }
      setIsLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await setDoc(userDocRef, preferences, { merge: true });
        setUserProfile(prev => prev ? { ...prev, ...preferences } : null);
        setIsLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase update user preferences error:", e);
        return { success: false, errorKey: 'generic_error' };
      }
    } else {
      return { success: false, errorKey: 'not_found' };
    }
  }, [toast]); // Added toast
  
  // Check if firebaseUser exists AND email is verified for isAuthenticated
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

