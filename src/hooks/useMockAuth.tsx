
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
  // getAdditionalUserInfo // Not strictly needed for current implementation
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseConfigIsValid } from '@/lib/firebase'; 
import { useToast } from './use-toast';

// User data structure stored in Firestore
interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: any; // Firestore serverTimestamp or Date or ISO string
}

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

interface AuthContextType {
  isAuthenticated: boolean;
  currentUserEmail: string | null;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
  userId: string | null;
  login: (email?: string, password?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  signup: (email?: string, password?: string, name?: string) => Promise<SignupResult>;
  signInWithGoogle: () => Promise<LoginResult>;
  deleteAccount: () => Promise<void>;
  changePassword: (newPassword?: string) => Promise<ChangePasswordResult>;
  updateProfilePicture: (imageDataUri: string) => Promise<UpdateProfilePictureResult>;
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
    if (!firebaseConfigIsValid || !db) {
      console.warn("Firestore is not configured, cannot fetch user profile.");
      return null;
    }
    const userDocRef = doc(db, 'users', uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        return {
          ...profileData,
          createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt.toDate().toISOString() : profileData.createdAt,
        } as UserProfile;
      }
      return null;
    } catch (e: any) {
      console.error("Error fetching user profile from Firestore:", e);
      if (e instanceof Error) {
        // Check for common Firestore offline/network errors
        if (e.name === 'FirebaseError' && ( (e as any).code === 'unavailable' || (e as any).code === 'cancelled' || e.message.toLowerCase().includes('offline') || e.message.toLowerCase().includes('failed to get document because the client is offline') ) ) {
            console.error(`Firestore fetchUserProfile network/offline error: ${e.message}. Check Firestore status and network connection.`);
        } else if ((e as any).code === 0 || e.message.toLowerCase().includes('failed to fetch')) { // General fetch failure often indicates CORS or network path issues
           console.error(`Firestore fetchUserProfile network/CORS error: ${e.message}. Check Firebase platform settings (CORS), network connection, and browser's network tab for more details.`);
        } else {
           console.error(`Firestore fetchUserProfile error (Code: ${(e as any).code}): ${e.message}.`);
        }
      } else {
        console.error("An unknown error occurred while fetching user profile:", e);
      }
      return null;
    }
  }, []);


  const ensureUserProfileExists = useCallback(async (user: FirebaseUser, isNewGoogleUser: boolean = false) => {
    if (!firebaseConfigIsValid || !db) {
      console.warn("Firestore is not configured, cannot ensure user profile.");
      return;
    }
    const userDocRef = doc(db, 'users', user.uid);
    let profileToSet: UserProfile | null = null;
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        profileToSet = {
          ...profileData,
          createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt.toDate().toISOString() : profileData.createdAt,
        } as UserProfile;
      } else {
        const newProfileData: UserProfile = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || (isNewGoogleUser && user.email ? user.email.split('@')[0] : 'Ny Användare'),
          avatarUrl: user.photoURL,
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newProfileData);
        profileToSet = { ...newProfileData, createdAt: new Date().toISOString() }; // Simulate serverTimestamp for local state
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
      console.warn("Firebase configuration is invalid. Auth services will not function.");
      return;
    }

    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await ensureUserProfileExists(user);
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [ensureUserProfileExists]);


  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        // User is technically logged in by Firebase, but email not verified.
        // onAuthStateChanged will set firebaseUser. Let UI handle verification prompt.
        setIsLoading(false);
        return { success: false, errorKey: 'account_not_verified' };
      }
      // If email is verified, ensureUserProfileExists would have been called by onAuthStateChanged
      setIsLoading(false);
      return { success: true };

    } catch (e: any) {
      setIsLoading(false);
      console.error("Firebase login error:", e);
      let errorKey: LoginResult['errorKey'] = 'generic_error';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        let specificMessage = `Login attempt failed for email: ${email} with Firebase code: ${e.code}.`;
        if (e.code === 'auth/invalid-credential') {
            specificMessage += " This specifically means the credential (e.g., email/password combination) is malformed or incorrect, or the user might not exist.";
        } else {
            specificMessage += " This usually means the email doesn't exist or the password was incorrect.";
        }
        console.warn(specificMessage);
        errorKey = 'invalid_credentials';
      } else if (e.code === 'auth/user-disabled') {
        errorKey = 'user-disabled';
      } else if (e.code === 'auth/too-many-requests') {
        errorKey = 'too-many-requests';
      }
      return { success: false, errorKey };
    }
  }, []); 

  const signInWithGoogle = useCallback(async (): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // ensureUserProfileExists will be called by onAuthStateChanged if successful.
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
    if (!firebaseConfigIsValid) return;
    setIsLoading(true);
    try {
      const currentUid = firebaseUser?.uid; 
      await signOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
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

      if (db) { 
        const userProfileData: UserProfile = {
          uid: user.uid,
          email: user.email,
          name: name,
          avatarUrl: user.photoURL, 
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'users', user.uid), userProfileData);
        // No need to call setUserProfile here, onAuthStateChanged will handle it via ensureUserProfileExists
      } else {
        console.warn("Firestore db instance not available, skipping profile creation in DB for new user.");
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
  }, [toast]); // Removed ensureUserProfileExists from deps, it's called via onAuthStateChanged

  const resendVerification = useCallback(async (): Promise<{ success: boolean; errorKey?: string }> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Check if user is already verified to avoid unnecessary emails/errors
      if (currentUser.emailVerified) {
        toast({ title: "E-post Redan Verifierad", description: "Din e-postadress är redan verifierad.", variant: "default" });
        return { success: true }; // Or a specific key indicating already verified
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

 const deleteRelatedData = async (uid: string) => {
    if (!db || !firebaseConfigIsValid) {
      console.warn("Firestore db instance not available or Firebase not configured, skipping deletion of related data.");
      return;
    }
    const batch = writeBatch(db);

    // Delete user's boards
    const boardsQuery = query(collection(db, "boards"), where("userId", "==", uid));
    const boardsSnapshot = await getDocs(boardsQuery);
    boardsSnapshot.forEach((docSnapshot) => batch.delete(docSnapshot.ref));

    // Delete user's bills
    const billsQuery = query(collection(db, "bills"), where("userId", "==", uid));
    const billsSnapshot = await getDocs(billsQuery);
    billsSnapshot.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
    
    // Delete user's profile document
    const userProfileDocRef = doc(db, "users", uid);
    batch.delete(userProfileDocRef);

    await batch.commit();
  };


  const deleteAccount = useCallback(async () => {
    if (!firebaseConfigIsValid) return;
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      setIsLoading(true);
      try {
        await deleteRelatedData(currentUser.uid); // Delete Firestore data first
        await firebaseDeleteUser(currentUser);    // Then delete Firebase Auth user
        
        setFirebaseUser(null);
        setUserProfile(null);
        const activeIdKey = `ekonova-active-board-id-${currentUser.uid}`;
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
    if (currentUser && db) {
      setIsLoading(true);
      try {
        // Update in Firebase Auth (if you want the photoURL there to be in sync)
        await updateProfile(currentUser, { photoURL: imageDataUri });
        
        // Update in Firestore 'users' collection
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { avatarUrl: imageDataUri }, { merge: true });

        // Update local state
        setUserProfile(prev => prev ? { ...prev, avatarUrl: imageDataUri } : null);
        // FirebaseUser state might not immediately reflect photoURL update from updateProfile,
        // but onAuthStateChanged might pick it up eventually, or we can force-set it
        // if (auth.currentUser) setFirebaseUser({...auth.currentUser, photoURL: imageDataUri });
        setFirebaseUser(auth.currentUser); // Re-set to get the potentially updated user object from auth

        setIsLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase update profile picture error:", e);
        return { success: false, errorKey: 'generic_error' }; 
      }
    } else {
      setIsLoading(false);
      if (!currentUser) console.error("Update profile picture: No user logged in.");
      if (!db) console.error("Update profile picture: Firestore db instance not available.");
      return { success: false, errorKey: 'generic_error' }; 
    }
  }, []);
  
  const isAuthenticatedResult = firebaseConfigIsValid && !!firebaseUser && !!firebaseUser.emailVerified;

  return (
    <AuthContext.Provider value={{
      isAuthenticated: isAuthenticatedResult,
      currentUserEmail: firebaseUser?.email || null,
      currentUserName: userProfile?.name || firebaseUser?.displayName || null,
      currentUserAvatarUrl: userProfile?.avatarUrl || firebaseUser?.photoURL || null,
      userId: firebaseUser?.uid || null,
      login,
      logout,
      signup,
      signInWithGoogle,
      deleteAccount,
      changePassword,
      updateProfilePicture,
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


