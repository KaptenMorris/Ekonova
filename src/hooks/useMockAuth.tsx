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
import { account, avatars, configOk } from '@/lib/appwrite'; // Use Appwrite client and import configOk
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
  errorKey?: 'invalid_credentials' | 'account_not_verified' | 'config_error' | 'generic_error';
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
  errorKey?: 'invalid_current_password' | 'config_error' | 'generic_error';
}

interface UpdateProfilePictureResult {
  success: boolean;
  errorKey?: 'config_error' | 'generic_error';
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
  updateProfilePicture: (imageDataUri: string) => Promise<UpdateProfilePictureResult>;
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
    if (!configOk) {
        // This console.error is from appwrite.ts if config is bad, no need to repeat here.
        // Just ensure loading stops and user is null.
        setIsLoading(false);
        setUser(null);
        return;
    }
    setIsLoading(true);
    try {
      const currentUser = await account.get() as AppwriteUser;
      setUser(currentUser);
       // Set a default avatar if none exists in prefs
       if (!currentUser.prefs?.avatarUrl) {
         const userInitial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'A');
         // Use Appwrite's avatar service to generate an initial-based avatar
         const avatarUrl = avatars.getInitials(userInitial).toString(); // .toString() to get the URL
         // Update user state with this new avatar URL (optimistic, or re-fetch if prefs were updated)
         // For simplicity, just updating local state. A robust solution might update prefs.
         setUser(prev => prev ? { ...prev, prefs: { ...prev.prefs, avatarUrl: avatarUrl } } : null);
       }

    } catch (e) {
      // setUser(null); // Moved to finally block logic
      if (e instanceof AppwriteException) {
          // Code 0 often indicates a network error or CORS issue before a proper HTTP code is received
          if (e.code === 0 || (e.message && e.message.toLowerCase().includes('failed to fetch'))) {
             console.error(`Appwrite fetchUser network/CORS error: ${e.message}. **CRITICAL: THIS IS LIKELY A CORS ISSUE.** Check your Appwrite project's 'Platforms' settings to ensure your frontend hostname (e.g., localhost, or your cloud deployment URL) is correctly added. Also verify network connectivity and see browser's network tab for request details.`);
             // Don't toast here to avoid noise on initial load when logged out
          } else {
             console.error(`Appwrite fetchUser error (Code: ${e.code}): ${e.message}. Type: ${e.type}`);
             // Potentially toast for other specific Appwrite errors if needed, but generally fetchUser failures are silent
          }
      } else {
          console.error("Generic fetchUser error:", e);
      }
      setUser(null); // Ensure user is null if any error occurs
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!configOk) {
        toast({
            title: "Konfigurationsfel",
            description: "Appen kan inte ansluta till servern. Kontrollera .env.local och starta om, samt Appwrites plattformsinställningar (CORS).",
            variant: "destructive",
            duration: 7000,
        });
        return { success: false, errorKey: 'config_error' };
    }
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    setIsLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      await fetchUser(); // Re-fetch user data to update state
      router.push('/dashboard'); // Redirect after successful login and user fetch
      return { success: true };
    } catch (e) {
      // console.error("Appwrite login error:", e); // More specific toasts below
      setIsLoading(false);
      if (e instanceof AppwriteException) {
          if (e.code === 401) { // Invalid credentials
              // Attempt to get user to check if it's an unverified account issue
              try {
                  // This might not be the correct email if login failed, Appwrite doesn't return user on failed login
                  // The check for unverified should ideally happen based on error type/message
                  // For now, assume 401 is invalid credentials or unverified if a general "User (role: guest) missing scope (account)" type error.
                  // A more specific error message from Appwrite for unverified account during login would be ideal.
                  // Appwrite might return a specific error for "email not verified" if configured to block unverified logins.
                  // The current Appwrite behavior for unverified users trying to log in can vary based on project settings.
                  // A common approach: if login fails with 401, check if the error message indicates verification needed.
                  if (e.message.toLowerCase().includes('verification is not complete') || e.message.toLowerCase().includes('email not verified')) {
                     return { success: false, errorKey: 'account_not_verified' };
                  }
              } catch (getUserError) {
                 // Failed to get user, so it's likely truly invalid credentials
                 return { success: false, errorKey: 'invalid_credentials' };
              }
              return { success: false, errorKey: 'invalid_credentials' };
          }
          if (e.code === 400 && e.message.toLowerCase().includes('user_email_not_verified')) { // Specific Appwrite error
               return { success: false, errorKey: 'account_not_verified' };
          }
           if (e.code === 0 || e.message.toLowerCase().includes('failed to fetch')) {
               toast({ title: "Nätverksfel", description: "Kunde inte ansluta till servern. Kontrollera din internetanslutning och att Appwrite-plattformen är korrekt konfigurerad (CORS).", variant: "destructive", duration: 7000 });
               return { success: false, errorKey: 'generic_error' };
           }
      }
      return { success: false, errorKey: 'invalid_credentials' }; // Default to invalid credentials
    }
  }, [router, fetchUser, toast]);

  const logout = useCallback(async () => {
    if (!configOk) {
        toast({ title: "Konfigurationsfel", description: "Appen är inte korrekt konfigurerad.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      await account.deleteSession('current');
      setUser(null);
      router.push('/login'); // Redirect after logout
    } catch (e) {
      console.error("Appwrite logout error:", e);
       if (e instanceof AppwriteException && (e.code === 0 || e.message.toLowerCase().includes('failed to fetch'))) {
           toast({ title: "Nätverksfel vid utloggning", description: "Försök igen.", variant: "destructive" });
       } else {
           toast({ title: "Utloggning Misslyckades", description: "Kunde inte logga ut. Försök igen.", variant: "destructive" });
       }
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const signup = useCallback(async (email?: string, password?: string, name?: string): Promise<SignupResult> => {
    if (!configOk) {
         toast({
            title: "Konfigurationsfel",
            description: "Appen kan inte ansluta till servern. Kontrollera .env.local och starta om, samt Appwrites plattformsinställningar (CORS).",
            variant: "destructive",
            duration: 7000,
        });
        return { success: false, messageKey: 'config_error' };
    }
    if (!email || !password || !name) return { success: false, messageKey: 'generic_error' };
    setIsLoading(true);
    try {
      await account.create(ID.unique(), email, password, name);
       // Construct verification URL based on current window location (client-side)
       const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-email` : ''; // Default to empty if window not defined (e.g. SSR, though this runs client-side)
       if (verificationUrl) {
            await account.createVerification(verificationUrl); // Send verification email
            setIsLoading(false);
            return { success: true, messageKey: 'verification_sent' };
       } else {
            console.error("Could not determine verification URL during signup.");
             setIsLoading(false);
             toast({ title: "Registreringsfel", description: "Kunde inte skapa verifieringslänk.", variant: "destructive"});
            return { success: false, messageKey: 'generic_error' };
       }
    } catch (e) {
      console.error("Appwrite signup error:", e);
      setIsLoading(false);
      if (e instanceof AppwriteException && e.code === 409) { // User already exists
        return { success: false, messageKey: 'already_registered' };
      }
      if (e instanceof AppwriteException && (e.code === 0 || e.message.toLowerCase().includes('failed to fetch'))) {
           toast({ title: "Nätverksfel", description: "Kunde inte ansluta till servern. Kontrollera din internetanslutning och att Appwrite-plattformen är korrekt konfigurerad (CORS).", variant: "destructive", duration: 7000 });
           return { success: false, messageKey: 'generic_error' };
      }
      return { success: false, messageKey: 'generic_error' };
    }
  }, [toast]);

   const verifyEmail = useCallback(async (userIdParam: string, secret: string): Promise<VerifyEmailResult> => {
    if (!configOk) {
         toast({ title: "Konfigurationsfel", description: "Appen är inte korrekt konfigurerad.", variant: "destructive" });
        return { success: false, errorKey: 'config_error' };
    }
    setIsLoading(true);
    try {
        await account.updateVerification(userIdParam, secret); // Use Appwrite SDK
        setIsLoading(false);
        return { success: true };
    } catch (e) {
        console.error("Appwrite verification error:", e);
        setIsLoading(false);
         if (e instanceof AppwriteException) {
            // Appwrite specific error codes for verification
            if (e.message.toLowerCase().includes('already verified')) { // Heuristic, better to check specific codes if available
                return { success: true, errorKey: 'already_verified'}; // Treat as success if already done
            }
             if (e.code === 404 || e.code === 401) { // User or token not found / invalid
                return { success: false, errorKey: 'invalid_token' };
             }
              if (e.code === 0 || e.message.toLowerCase().includes('failed to fetch')) {
                 toast({ title: "Nätverksfel", description: "Kunde inte ansluta till servern. Kontrollera din internetanslutning.", variant: "destructive" });
                 return { success: false, errorKey: 'generic_error' };
             }
         }
        return { success: false, errorKey: 'generic_error' };
    }
  }, [toast]);

   const resendVerification = useCallback(async (): Promise<{ success: boolean; errorKey?: string }> => {
       if (!configOk) {
            toast({ title: "Konfigurationsfel", description: "Appen är inte korrekt konfigurerad.", variant: "destructive" });
            return { success: false, errorKey: 'config_error' };
       }
        setIsLoading(true);
        const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-email` : '';
        if (!verificationUrl) {
            console.error("Could not determine verification URL for resend");
            setIsLoading(false);
             toast({ title: "Fel", description: "Kunde inte skapa verifieringslänk.", variant: "destructive"});
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
             if (e instanceof AppwriteException && e.message.toLowerCase().includes('already verified')) {
                 errorKey = 'already_verified';
                 toast({ title: "Redan Verifierad", description: "Ditt konto är redan verifierat.", variant: "default" });
             } else if (e instanceof AppwriteException && (e.code === 0 || e.message.toLowerCase().includes('failed to fetch'))) {
                  toast({ title: "Nätverksfel", description: "Kunde inte skicka verifieringsmail.", variant: "destructive" });
             }
             else {
                toast({ title: "Fel", description: "Kunde inte skicka verifieringsmail.", variant: "destructive" });
             }
            return { success: false, errorKey: errorKey };
        }
    }, [toast]);


  const deleteAccount = useCallback(async () => {
    if (!configOk) {
        toast({ title: "Konfigurationsfel", description: "Appen är inte korrekt konfigurerad.", variant: "destructive" });
        return;
    }
    if (!user || !user.$id) {
        toast({ title: "Fel", description: "Ingen användare inloggad för att radera.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
        // Important: For full account deletion, Appwrite requires a server-side API key with `users.delete` scope.
        // `account.delete()` is not a standard client-side SDK method.
        // The closest client-side action is to delete all sessions, effectively logging the user out everywhere.
        // This mock will simulate deletion by logging out and clearing user state.
        // Actual deletion would need a backend call.
        await account.deleteSession('current'); // Log out current session
        // await account.deleteSessions(); // Log out all sessions for the user

        setUser(null);
        router.push('/login'); // Redirect to login after "deletion"
        toast({
            title: "Konto 'Raderat' (Utloggad)",
            description: "För att fullständigt radera kontot krävs en server-side åtgärd med API-nyckel. Du har loggats ut och dina data kommer att tas bort manuellt/via serverprocess vid behov.",
            variant: "default", // Using 'default' as it's an informational message about the mock behavior
            duration: 10000,
        });

        // To actually delete the user, you'd call from a backend:
        // const appwriteServerClient = new Client().setEndpoint(...).setProject(...).setKey(YOUR_SERVER_API_KEY);
        // const users = new Users(appwriteServerClient);
        // await users.delete(user.$id);

    } catch (e) {
        console.error("Appwrite delete account/session error:", e);
        if (e instanceof AppwriteException && (e.code === 0 || e.message.toLowerCase().includes('failed to fetch'))) {
             toast({ title: "Nätverksfel", description: "Kunde inte radera konto/session. Kontrollera din anslutning.", variant: "destructive" });
        } else {
            toast({ title: "Fel Vid Radering", description: "Kunde inte radera konto/session. Försök igen.", variant: "destructive" });
        }
    } finally {
        setIsLoading(false);
    }
  }, [user, router, toast]);

  const changePassword = useCallback(async (currentPassword?: string, newPassword?: string): Promise<ChangePasswordResult> => {
    if (!configOk) {
        toast({ title: "Konfigurationsfel", description: "Appen är inte korrekt konfigurerad.", variant: "destructive" });
        return { success: false, errorKey: 'config_error' };
    }
    if (!currentPassword || !newPassword) return { success: false, errorKey: 'generic_error' }; // Should be handled by form validation
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
        if (e instanceof AppwriteException && (e.code === 0 || e.message.toLowerCase().includes('failed to fetch'))) {
           toast({ title: "Nätverksfel", description: "Kunde inte ändra lösenord. Kontrollera din anslutning.", variant: "destructive" });
           return { success: false, errorKey: 'generic_error' };
        }
      return { success: false, errorKey: 'generic_error' };
    }
  }, [toast]);

  const updateProfilePicture = useCallback(async (imageDataUri: string): Promise<UpdateProfilePictureResult> => {
       if (!configOk) {
           toast({ title: "Konfigurationsfel", description: "Appen är inte korrekt konfigurerad.", variant: "destructive" });
           return { success: false, errorKey: 'config_error' };
       }
      if (!user) return { success: false, errorKey: 'generic_error' }; // No user logged in
       setIsLoading(true);
      try {
          // Update user preferences in Appwrite to store the avatar URL
          const currentPrefs = user.prefs || {};
          await account.updatePrefs({ ...currentPrefs, avatarUrl: imageDataUri });
          // Update local user state immediately for responsive UI
          setUser(prev => prev ? { ...prev, prefs: { ...prev.prefs, avatarUrl: imageDataUri } } : null);
          setIsLoading(false);
          return { success: true };
      } catch (e) {
          console.error("Appwrite update avatar pref error:", e);
          setIsLoading(false);
          if (e instanceof AppwriteException && (e.code === 0 || e.message.toLowerCase().includes('failed to fetch'))) {
             toast({ title: "Nätverksfel", description: "Kunde inte uppdatera profilbild. Kontrollera din anslutning.", variant: "destructive" });
             return { success: false, errorKey: 'generic_error' };
          }
          return { success: false, errorKey: 'generic_error' };
      }
  }, [user, toast]);


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      currentUserEmail: user?.email || null,
      currentUserName: user?.name || null,
      currentUserAvatarUrl: user?.prefs?.avatarUrl || null, // Get avatar from prefs
      userId: user?.$id || null,
      login,
      logout,
      signup,
      deleteAccount,
      verifyEmail,
      changePassword,
      updateProfilePicture, // Provide the new function
      resendVerification,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export function useAuth() { // Renamed from useMockAuth to useAuth
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth måste användas inom en AuthProvider');
  }
  return context;
}
