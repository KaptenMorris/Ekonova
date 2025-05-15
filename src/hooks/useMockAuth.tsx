
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode
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
  GoogleAuthProvider, // Added
  signInWithPopup,      // Added
  getAdditionalUserInfo // Added
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
  signInWithGoogle: () => Promise<LoginResult>; // Added
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

  const ensureUserProfileExists = useCallback(async (user: FirebaseUser) => {
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
        // If no profile doc, create one
        const newProfileData: UserProfile = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Ny Användare', // Use Google's display name if available
          avatarUrl: user.photoURL, // Use Google's photo URL if available
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newProfileData);
        profileToSet = { ...newProfileData, createdAt: new Date().toISOString() }; // Use current date for local state
      }
      setUserProfile(profileToSet);
    } catch (error) {
      console.error("Error fetching/creating user profile:", error);
      toast({ title: "Profilfel", description: "Kunde inte ladda eller skapa användarprofil.", variant: "destructive" });
      setUserProfile(null); // Reset profile on error
    }
  }, [toast]);


  useEffect(() => {
    if (!firebaseConfigIsValid) {
      setIsLoading(false);
      console.error("CRITICAL: Firebase is not configured correctly. Authentication and database features will not work.");
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
      // Verified user, onAuthStateChanged handles profile and redirection is typically managed by useEffect in layouts
      // router.push('/dashboard'); // Optionally redirect here
      return { success: true };

    } catch (e: any) {
      setIsLoading(false);
      console.error("Firebase login error:", e);
      let errorKey: LoginResult['errorKey'] = 'generic_error';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        errorKey = 'invalid_credentials';
      } else if (e.code === 'auth/user-disabled') {
        errorKey = 'user-disabled';
      } else if (e.code === 'auth/too-many-requests') {
        errorKey = 'too-many-requests';
      }
      return { success: false, errorKey };
    }
  }, [router]); // Removed toast from here, caller should handle toasts

  const signInWithGoogle = useCallback(async (): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // ensureUserProfileExists will be called by onAuthStateChanged,
      // which is triggered by signInWithPopup's successful authentication.
      // So, no need to call it explicitly here again if onAuthStateChanged is robust.
      
      // Redirection should be handled by useEffect in layouts after auth state changes
      // router.push('/dashboard'); 
      return { success: true };
    } catch (error: any) {
      setIsLoading(false);
      console.error("Google Sign-In Error:", error);
      toast({
        title: "Google Inloggning Misslyckades",
        description: error.message || "Kunde inte logga in med Google. Försök igen.",
        variant: "destructive",
      });
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, errorKey: 'generic_error' }; // Or a specific key for this
      }
      return { success: false, errorKey: 'generic_error' };
    }
  }, [toast, router]);


  const logout = useCallback(async () => {
    if (!firebaseConfigIsValid) return;
    setIsLoading(true);
    try {
      await signOut(auth);
      router.push('/login');
    } catch (e) {
      console.error("Firebase logout error:", e);
      toast({ title: "Utloggning Misslyckades", description: "Kunde inte logga ut. Försök igen.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const signup = useCallback(async (email?: string, password?: string, name?: string): Promise<SignupResult> => {
    if (!firebaseConfigIsValid) return { success: false, messageKey: 'config_error' };
    if (!email || !password || !name) return { success: false, messageKey: 'generic_error' };
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: name });

      // Create Firestore user profile document
      // This will be handled by onAuthStateChanged -> ensureUserProfileExists if the user object changes
      // However, we can pre-emptively set it here for faster UI update, or rely on onAuthStateChanged
      const userProfileData: UserProfile = {
        uid: user.uid,
        email: user.email,
        name: name,
        avatarUrl: user.photoURL, // Usually null at this point for email/pass
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', user.uid), userProfileData);
      // To ensure local state is updated immediately without waiting for onAuthStateChanged full cycle
      setUserProfile({ ...userProfileData, createdAt: new Date().toISOString()});


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

  const deleteAccount = useCallback(async () => {
    if (!firebaseConfigIsValid) return;
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
        await firebaseDeleteUser(currentUser);
        // onAuthStateChanged will clear local state (firebaseUser, userProfile).
        router.push('/login'); // Redirect after successful deletion
        toast({ title: "Konto Raderat", description: "Ditt konto har raderats permanent." });
      } catch (e: any) {
        console.error("Firebase delete account error:", e);
        if (e.code === 'auth/requires-recent-login') {
          toast({ title: "Återautentisering Krävs", description: "Logga in igen och försök sedan radera kontot.", variant: "destructive" });
          // Consider redirecting to login or showing a re-auth modal for reauthentication
        } else {
          toast({ title: "Fel Vid Radering", description: "Kunde inte radera konto.", variant: "destructive" });
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
    if (!newPassword) return { success: false, errorKey: 'generic_error' }; // Or more specific error
    
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
      return { success: false, errorKey: 'generic_error' }; // No user logged in
    }
  }, []);

  const updateProfilePicture = useCallback(async (imageDataUri: string): Promise<UpdateProfilePictureResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      setIsLoading(true);
      try {
        await updateProfile(currentUser, { photoURL: imageDataUri });
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { avatarUrl: imageDataUri }, { merge: true });

        // Optimistically update local state or rely on onAuthStateChanged
        setUserProfile(prev => prev ? { ...prev, avatarUrl: imageDataUri } : null);
        // FirebaseUser state will be updated by onAuthStateChanged if photoURL is part of it

        setIsLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase update profile picture error:", e);
        return { success: false, errorKey: 'generic_error' }; // Could be 'storage_error' if using Firebase Storage
      }
    } else {
      setIsLoading(false);
      return { success: false, errorKey: 'generic_error' }; // No user logged in
    }
  }, []);
  
  // Användaren är "autentiserad" i appen om Firebase har en användare OCH den användarens e-post är verifierad.
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
      signInWithGoogle, // Added
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
