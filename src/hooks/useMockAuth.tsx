
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
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; // Import Firebase services
import { useToast } from './use-toast';

// User data structure that might be stored in Firestore (separate from Auth user)
interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  avatarUrl?: string | null;
  // Add other profile fields if needed
}

interface LoginResult {
  success: boolean;
  errorKey?: 'invalid_credentials' | 'account_not_verified' | 'config_error' | 'generic_error' | 'user-disabled' | 'too-many-requests';
}

interface SignupResult {
  success: boolean;
  messageKey?: 'verification_sent' | 'already_registered' | 'config_error' | 'generic_error';
}

interface VerifyEmailResult {
    success: boolean;
    errorKey?: 'invalid_token' | 'already_verified' | 'config_error' | 'generic_error';
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
  verifyEmail: (oobCode: string) => Promise<VerifyEmailResult>; // Firebase uses oobCode from link
  changePassword: (newPassword?: string) => Promise<ChangePasswordResult>; // Current password not needed for Firebase if user is recently logged in
  updateProfilePicture: (imageDataUri: string) // Simplified: Firebase Storage upload would be better
    => Promise<UpdateProfilePictureResult>;
  isLoading: boolean;
  resendVerification: () => Promise<{ success: boolean; errorKey?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // For additional profile data from Firestore
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Fetch additional profile data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          // If no profile doc, create one (e.g., if user was created but profile step failed)
          // Or, this could mean the profile is only reliant on auth.displayName/photoURL
          const newProfile: UserProfile = {
             uid: user.uid,
             email: user.email,
             name: user.displayName,
             avatarUrl: user.photoURL
          };
          await setDoc(userDocRef, newProfile, { merge: true }); // merge:true is safer
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await signOut(auth); // Log out user if email not verified
        setIsLoading(false);
        return { success: false, errorKey: 'account_not_verified' };
      }
      // onAuthStateChanged will handle setting user and profile
      router.push('/dashboard');
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
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null
      router.push('/login');
    } catch (e) {
      console.error("Firebase logout error:", e);
      toast({ title: "Utloggning Misslyckades", description: "Kunde inte logga ut. Försök igen.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const signup = useCallback(async (email?: string, password?: string, name?: string): Promise<SignupResult> => {
    if (!email || !password || !name) return { success: false, messageKey: 'generic_error' };
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: name });

      // Create user profile document in Firestore
      const userProfileData: UserProfile = {
        uid: user.uid,
        email: user.email,
        name: name,
        avatarUrl: null // Initial avatar can be set later
      };
      await setDoc(doc(db, 'users', user.uid), userProfileData);

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

  // Firebase verification is typically handled by a link from the email.
  // This function might be called on a verification page if you implement one.
  // For now, this is a placeholder as the actual verification happens via Firebase's flow.
  const verifyEmail = useCallback(async (oobCode: string): Promise<VerifyEmailResult> => {
    // Firebase's applyActionCode handles verification.
    // This function is more for an endpoint that Firebase redirects to.
    // The onAuthStateChanged listener should pick up the emailVerified status change.
    // For now, this is a simplified placeholder.
    // In a real app, you'd have a page that calls applyActionCode(auth, oobCode)
    console.warn("verifyEmail function called. Firebase verification handled by email link redirect and onAuthStateChanged.");
    setIsLoading(false); // Assuming this is called after a redirect
    if (auth.currentUser && auth.currentUser.emailVerified) {
        return { success: true, errorKey: 'already_verified' };
    }
    // A proper implementation would involve `applyActionCode` from 'firebase/auth'
    // but that's usually on a dedicated verification page.
    return { success: true }; // Optimistic, actual status from onAuthStateChanged
  }, []);


  const resendVerification = useCallback(async (): Promise<{ success: boolean; errorKey?: string }> => {
    setIsLoading(true);
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
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
      setIsLoading(false);
      toast({ title: "Fel", description: "Ingen användare inloggad.", variant: "destructive" });
      return { success: false, errorKey: 'generic_error' };
    }
  }, [toast]);

  const deleteAccount = useCallback(async () => {
    setIsLoading(true);
    if (auth.currentUser) {
      try {
        // Delete Firestore user profile document first
        await deleteDoc(doc(db, 'users', auth.currentUser.uid));
        // Then delete Firebase Auth user
        await firebaseDeleteUser(auth.currentUser);
        // onAuthStateChanged will handle setting user to null
        router.push('/login');
        toast({ title: "Konto Raderat", description: "Ditt konto har raderats permanent." });
      } catch (e: any) {
        setIsLoading(false);
        console.error("Firebase delete account error:", e);
        toast({ title: "Fel Vid Radering", description: "Kunde inte radera konto. Du kan behöva logga in igen.", variant: "destructive" });
         if (e.code === 'auth/requires-recent-login') {
          // Handle re-authentication if needed
        }
      }
    } else {
      setIsLoading(false);
      toast({ title: "Fel", description: "Ingen användare inloggad för att radera.", variant: "destructive" });
    }
  }, [router, toast]);

  const changePassword = useCallback(async (newPassword?: string): Promise<ChangePasswordResult> => {
    if (!newPassword) return { success: false, errorKey: 'generic_error' };
    setIsLoading(true);
    if (auth.currentUser) {
      try {
        // Firebase updatePassword does not require currentPassword if user is recently logged in
        await updatePassword(auth.currentUser, newPassword);
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
    // This is a simplified version. For actual file uploads, use Firebase Storage.
    // Here, we'll assume imageDataUri is a publicly accessible URL or a data URI
    // and update the user's photoURL in Auth and the avatarUrl in Firestore profile.
    setIsLoading(true);
    if (auth.currentUser) {
      try {
        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, { photoURL: imageDataUri });

        // Update Firestore user profile document
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, { avatarUrl: imageDataUri }, { merge: true });

        // Optimistically update local state
        setFirebaseUser(prev => prev ? { ...prev, photoURL: imageDataUri } : null);
        setUserProfile(prev => prev ? { ...prev, avatarUrl: imageDataUri } : null);

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


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!firebaseUser && firebaseUser.emailVerified, // Consider emailVerified for full auth
      currentUserEmail: firebaseUser?.email || null,
      currentUserName: userProfile?.name || firebaseUser?.displayName || null,
      currentUserAvatarUrl: userProfile?.avatarUrl || firebaseUser?.photoURL || null,
      userId: firebaseUser?.uid || null,
      login,
      logout,
      signup,
      deleteAccount,
      verifyEmail, // Note: Firebase handles this differently
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
    throw new Error('useAuth måste användas inom en AuthProvider (tidigare MockAuthProvider)');
  }
  return context;
}
