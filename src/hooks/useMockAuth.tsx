
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
import { account, avatars } from '@/lib/appwrite'; // Use Appwrite client
import { AppwriteException, ID } from 'appwrite';
import { useToast } from './use-toast';

// Define Appwrite-specific User model (subset of Appwrite's Models.User)
interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
  prefs: {
    avatarUrl?: string; // Store avatar URL in preferences
    // Add other preferences if needed
  };
}

interface LoginResult {
  success: boolean;
  errorKey?: 'invalid_credentials' | 'account_not_verified' | 'generic_error';
}

interface SignupResult {
  success: boolean;
  messageKey?: 'verification_sent' | 'already_registered' | 'generic_error';
}

interface VerifyEmailResult {
    success: boolean;
    errorKey?: 'invalid_token' | 'already_verified' | 'generic_error';
}

interface ChangePasswordResult {
  success: boolean;
  errorKey?: 'invalid_current_password' | 'generic_error';
}

interface UpdateProfilePictureResult {
  success: boolean;
  errorKey?: 'generic_error';
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUserEmail: string | null;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
  userId: string | null; // Add user ID
  login: (email?: string, password?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  signup: (email?: string, password?: string, name?: string) => Promise<SignupResult>;
  deleteAccount: () => Promise<void>;
  verifyEmail: (userId: string, secret: string) => Promise<VerifyEmailResult>;
  changePassword: (currentPassword?: string, newPassword?: string) => Promise<ChangePasswordResult>;
  updateProfilePicture: (imageDataUri: string) => Promise<UpdateProfilePictureResult>; // Will change this logic
  isLoading: boolean;
  resendVerification: () => Promise<{ success: boolean; errorKey?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await account.get() as AppwriteUser;
      setUser(currentUser);
      // Optionally generate/fetch avatar if not in prefs
       if (!currentUser.prefs?.avatarUrl) {
         // If no avatar in prefs, generate one based on name (or email initial)
         const userInitial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'A');
         // Note: Appwrite Avatars service generates URLs, doesn't store them directly
         const avatarUrl = avatars.getInitials(userInitial).toString();
         // We might want to save this generated URL to prefs, but getInitials is dynamic
         // For consistency, let's just use the dynamically generated URL for display if no pref exists
         setUser(prev => prev ? { ...prev, prefs: { ...prev.prefs, avatarUrl: avatarUrl } } : null);
       }

    } catch (e) {
      setUser(null); // Not logged in
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    setIsLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      await fetchUser(); // Fetch user data after successful login
      router.push('/dashboard');
      return { success: true };
    } catch (e) {
      console.error("Appwrite login error:", e);
      setIsLoading(false);
      if (e instanceof AppwriteException) {
          if (e.code === 401) { // Unauthorized
              // Check if it's due to unverified email
              try {
                  // Try getting the user to check verification status - THIS MIGHT FAIL if session not created at all
                  // A better approach might be needed depending on Appwrite's exact 401 reason separation
                  // For now, assume 401 could mean bad credentials OR unverified
                   return { success: false, errorKey: 'invalid_credentials' }; // Simplified
              } catch (userError) {
                 return { success: false, errorKey: 'invalid_credentials' };
              }
          }
          if (e.code === 400 && e.message.toLowerCase().includes('verify')) {
               return { success: false, errorKey: 'account_not_verified' };
          }
      }
      return { success: false, errorKey: 'invalid_credentials' }; // Default to invalid credentials
    }
  }, [router, fetchUser]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await account.deleteSession('current');
      setUser(null);
      router.push('/login');
    } catch (e) {
      console.error("Appwrite logout error:", e);
      toast({ title: "Utloggning Misslyckades", description: "Kunde inte logga ut. Försök igen.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const signup = useCallback(async (email?: string, password?: string, name?: string): Promise<SignupResult> => {
    if (!email || !password || !name) return { success: false, messageKey: 'generic_error' };
    setIsLoading(true);
    try {
      await account.create(ID.unique(), email, password, name);
      // Send verification email
      // Construct the verification URL based on your frontend routing
       const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-email` : ''; // Adjust if needed
       if (verificationUrl) {
            await account.createVerification(verificationUrl);
            setIsLoading(false);
            return { success: true, messageKey: 'verification_sent' };
       } else {
            console.error("Could not determine verification URL");
             setIsLoading(false);
            return { success: false, messageKey: 'generic_error' };
       }
    } catch (e) {
      console.error("Appwrite signup error:", e);
      setIsLoading(false);
      if (e instanceof AppwriteException && e.code === 409) { // User already exists
        return { success: false, messageKey: 'already_registered' };
      }
      return { success: false, messageKey: 'generic_error' };
    }
  }, []);

   const verifyEmail = useCallback(async (userId: string, secret: string): Promise<VerifyEmailResult> => {
    setIsLoading(true);
    try {
        await account.updateVerification(userId, secret);
        setIsLoading(false);
        // Optionally fetch user again or redirect, but success is enough for the page
        return { success: true };
    } catch (e) {
        console.error("Appwrite verification error:", e);
        setIsLoading(false);
         if (e instanceof AppwriteException) {
            if (e.message.includes('already verified')) { // Check specific error message if possible
                return { success: true, errorKey: 'already_verified'};
            }
             if (e.code === 404 || e.code === 401) { // Not found or invalid
                return { success: false, errorKey: 'invalid_token' };
             }
         }
        return { success: false, errorKey: 'generic_error' };
    }
  }, []);

   const resendVerification = useCallback(async (): Promise<{ success: boolean; errorKey?: string }> => {
        setIsLoading(true);
        const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-email` : '';
        if (!verificationUrl) {
            console.error("Could not determine verification URL for resend");
            setIsLoading(false);
            return { success: false, errorKey: 'generic_error' };
        }
        try {
            await account.createVerification(verificationUrl);
            setIsLoading(false);
            toast({ title: "Verifieringsmail Skickat", description: "Ett nytt verifieringsmail har skickats." });
            return { success: true };
        } catch (e) {
            console.error("Error resending verification:", e);
            setIsLoading(false);
            let errorKey = 'generic_error';
             if (e instanceof AppwriteException && e.message.includes('already verified')) {
                 errorKey = 'already_verified';
                 toast({ title: "Redan Verifierad", description: "Ditt konto är redan verifierat.", variant: "default" });
             } else {
                toast({ title: "Fel", description: "Kunde inte skicka verifieringsmail.", variant: "destructive" });
             }
            return { success: false, errorKey: errorKey };
        }
    }, [toast]);


  const deleteAccount = useCallback(async () => {
    // Appwrite doesn't have a direct "delete user" from client-side for security.
    // This typically requires a backend function or manual deletion.
    // We can simulate deletion by logging out and maybe marking prefs.
    console.warn("Kontoborttagning är inte implementerad med direkt Appwrite client SDK. Loggar ut istället.");
    await logout();
    // In a real app: Call a backend function -> Use Admin SDK to delete user -> Handle response
    toast({
      title: "Funktion Ej Tillgänglig",
      description: "Kontoborttagning måste hanteras via serversidan. Du har loggats ut.",
      variant: "destructive",
      duration: 7000,
    });
  }, [logout, toast]);

  const changePassword = useCallback(async (currentPassword?: string, newPassword?: string): Promise<ChangePasswordResult> => {
    if (!currentPassword || !newPassword) return { success: false, errorKey: 'generic_error' };
    setIsLoading(true);
    try {
      await account.updatePassword(newPassword, currentPassword);
      setIsLoading(false);
      return { success: true };
    } catch (e) {
      console.error("Appwrite change password error:", e);
      setIsLoading(false);
       if (e instanceof AppwriteException && (e.code === 401 || e.code === 400)) { // Unauthorized or bad request (often wrong current pass)
            return { success: false, errorKey: 'invalid_current_password' };
       }
      return { success: false, errorKey: 'generic_error' };
    }
  }, []);

  const updateProfilePicture = useCallback(async (imageDataUri: string): Promise<UpdateProfilePictureResult> => {
      // Appwrite doesn't directly store image data URIs in prefs easily.
      // Preferred methods:
      // 1. Use Appwrite Storage: Upload the image (converted from data URI to File/Blob), get the file ID, store the ID in user prefs. Fetch image via Storage API.
      // 2. Use Avatars Service: Use built-in generators (initials, gravatar, etc.) - URLs are dynamic.
      // 3. External Storage: Store the data URI on another service and save the URL in prefs.

      // For simplicity in this refactor, we'll *store the data URI directly in prefs*.
      // WARNING: This is inefficient and not recommended for production due to size limits and performance.
      if (!user) return { success: false, errorKey: 'generic_error' };
       setIsLoading(true);
      try {
          const currentPrefs = user.prefs || {};
          await account.updatePrefs({ ...currentPrefs, avatarUrl: imageDataUri });
          // Optimistically update local state
          setUser(prev => prev ? { ...prev, prefs: { ...prev.prefs, avatarUrl: imageDataUri } } : null);
          setIsLoading(false);
          return { success: true };
      } catch (e) {
          console.error("Appwrite update avatar pref error:", e);
          setIsLoading(false);
          return { success: false, errorKey: 'generic_error' };
      }
  }, [user]);


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      currentUserEmail: user?.email || null,
      currentUserName: user?.name || null,
      currentUserAvatarUrl: user?.prefs?.avatarUrl || null, // Get from prefs
      userId: user?.$id || null,
      login,
      logout,
      signup,
      deleteAccount,
      verifyEmail,
      changePassword,
      updateProfilePicture,
      resendVerification,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { // Renamed hook to useAuth
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth måste användas inom en AuthProvider');
  }
  return context;
}
