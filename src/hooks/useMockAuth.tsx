
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
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db, firebaseConfigIsValid } from '@/lib/firebase'; // Import Firebase services
import { useToast } from './use-toast';

// User data structure stored in Firestore
interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: any; // Firestore serverTimestamp or Date
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
  errorKey?: 'invalid_current_password' | 'config_error' | 'generic_error' | 'reauth_required';
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

  useEffect(() => {
    if (!firebaseConfigIsValid) {
      setIsLoading(false);
      // Optionally, show a persistent error message if Firebase config is invalid
      console.error("Firebase is not configured correctly. Authentication and database features will not work.");
      return;
    }

    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            setUserProfile({
              ...profileData,
              createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt.toDate().toISOString() : profileData.createdAt,
            } as UserProfile);
          } else {
            // If no profile doc, create one (e.g., if user was created but profile step failed)
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              avatarUrl: user.photoURL,
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile, { merge: true });
            setUserProfile({...newProfile, createdAt: new Date().toISOString()}); // temp createdAt for local state
          }
        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
          // Handle error, maybe set userProfile to null or a default
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User is signed in, now check email verification
      // onAuthStateChanged will update firebaseUser and userProfile state.
      // We don't need to manually set them here.

      if (!userCredential.user.emailVerified) {
        // DO NOT SIGN OUT HERE. Let the user stay "technically" logged in
        // so that auth.currentUser is available for resendVerification.
        // The isAuthenticated check (firebaseUser && firebaseUser.emailVerified)
        // will prevent access to protected routes.
        setIsLoading(false);
        return { success: false, errorKey: 'account_not_verified' };
      }
      
      // If email is verified, onAuthStateChanged will set the user,
      // and the useEffect in DashboardLayout or HomePage will redirect.
      router.push('/dashboard'); // Or let redirection be handled by useEffect in layout
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
  }, [router]);

  const logout = useCallback(async () => {
    if (!firebaseConfigIsValid) return;
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will clear firebaseUser and userProfile.
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

      await updateProfile(user, { displayName: name });

      const userProfileData: UserProfile = {
        uid: user.uid,
        email: user.email,
        name: name,
        avatarUrl: null, // Or user.photoURL if available and desired initially
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', user.uid), userProfileData);
      // onAuthStateChanged will update local state (firebaseUser, userProfile)

      await sendEmailVerification(user);
      setIsLoading(false);
      // User is technically logged in by Firebase, but email is not verified yet.
      // UI should show verification message.
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
    setIsLoading(true);
    const currentUser = auth.currentUser; 
    if (currentUser) {
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
      setIsLoading(false);
      return { success: false, errorKey: 'generic_error' };
    }
  }, [toast]);

  const deleteAccount = useCallback(async () => {
    if (!firebaseConfigIsValid) return;
    setIsLoading(true);
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Attempt to delete Firestore document first
        await deleteDoc(doc(db, 'users', currentUser.uid));
        // Then delete Firebase Auth user
        await firebaseDeleteUser(currentUser);
        // onAuthStateChanged will clear local state.
        router.push('/login');
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
      setIsLoading(false);
      toast({ title: "Fel", description: "Ingen användare inloggad för att radera.", variant: "destructive" });
    }
  }, [router, toast]);

  const changePassword = useCallback(async (newPassword?: string): Promise<ChangePasswordResult> => {
    if (!firebaseConfigIsValid) return { success: false, errorKey: 'config_error' };
    if (!newPassword) return { success: false, errorKey: 'generic_error' };
    
    setIsLoading(true);
    const currentUser = auth.currentUser;
    if (currentUser) {
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
    setIsLoading(true);
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await updateProfile(currentUser, { photoURL: imageDataUri });
        // Update Firestore profile as well
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { avatarUrl: imageDataUri }, { merge: true });

        // Update local state Optimistically or wait for onAuthStateChanged/onSnapshot
        setUserProfile(prev => prev ? { ...prev, avatarUrl: imageDataUri } : null);
        // If firebaseUser's photoURL is directly used, it might need manual update or rely on onAuthStateChanged
        // setFirebaseUser(prev => prev ? {...prev, photoURL: imageDataUri} : null); // This is tricky, Firebase manages this.

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

