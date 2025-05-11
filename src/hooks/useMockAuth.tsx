
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
import { v4 as uuidv4 } from 'uuid';

interface StoredUser {
  email: string;
  passwordHash: string; // In a real app, this would be a proper hash
  name: string;
  isVerified: boolean;
  verificationToken?: string;
  isDeleted?: boolean;
  createdAt: string;
  avatarUrl?: string; // New field for avatar
}

interface LoginResult {
  success: boolean;
  errorKey?: 'account_deleted' | 'account_not_verified' | 'invalid_credentials' | 'generic_error';
}

interface SignupResult {
  success: boolean;
  messageKey?: 'verification_sent' | 'verification_resent' | 'already_registered' | 'generic_error';
  verificationTokenForMock?: string; // For mock display
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


interface MockAuthContextType {
  isAuthenticated: boolean;
  currentUserEmail: string | null;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null; // New state for avatar URL
  login: (email?: string, password?: string) => Promise<LoginResult>;
  logout: () => void;
  signup: (email?: string, password?: string, name?: string) => Promise<SignupResult>;
  deleteAccount: () => Promise<void>;
  verifyEmail: (token: string) => Promise<VerifyEmailResult>;
  changePassword: (currentPassword?: string, newPassword?: string) => Promise<ChangePasswordResult>; // New function
  updateProfilePicture: (imageDataUri: string) => Promise<UpdateProfilePictureResult>; // New function
  isLoading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

const USERS_DB_KEY = 'ekonova-users-db';
const SESSION_EMAIL_KEY = 'ekonova_session_user_email';


const getUsersFromStorage = (): StoredUser[] => {
  if (typeof window === 'undefined') return [];
  try {
    const storedUsers = localStorage.getItem(USERS_DB_KEY);
    return storedUsers ? JSON.parse(storedUsers) : [];
  } catch (error) {
    console.error("Kunde inte hämta användare från localStorage:", error);
    return [];
  }
};

const saveUsersToStorage = (users: StoredUser[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Kunde inte spara användare till localStorage:", error);
  }
};


export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null); // State for avatar
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const sessionEmail = localStorage.getItem(SESSION_EMAIL_KEY);
      if (sessionEmail) {
        const users = getUsersFromStorage();
        const user = users.find(u => u.email === sessionEmail && !u.isDeleted && u.isVerified);
        if (user) {
          setIsAuthenticated(true);
          setCurrentUserEmail(user.email);
          setCurrentUserName(user.name);
          setCurrentUserAvatarUrl(user.avatarUrl || null); // Load avatar URL
        } else {
          // Invalid session, clear it
          localStorage.removeItem(SESSION_EMAIL_KEY);
          setIsAuthenticated(false);
          setCurrentUserEmail(null);
          setCurrentUserName(null);
          setCurrentUserAvatarUrl(null);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        setCurrentUserName(null);
        setCurrentUserAvatarUrl(null);
      }
    } catch (error) {
      console.error("Fel vid initiering av autentiseringsstatus:", error);
      setIsAuthenticated(false);
      setCurrentUserEmail(null);
      setCurrentUserName(null);
      setCurrentUserAvatarUrl(null);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email?: string, password?: string): Promise<LoginResult> => {
    if (!email || !password) return { success: false, errorKey: 'invalid_credentials' };
    if (typeof window === 'undefined') return { success: false, errorKey: 'generic_error' };

    const users = getUsersFromStorage();
    const user = users.find(u => u.email === email);

    if (!user || user.passwordHash !== password) { // Plain text password check for mock
      return { success: false, errorKey: 'invalid_credentials' };
    }
    if (user.isDeleted) {
      return { success: false, errorKey: 'account_deleted' };
    }
    if (!user.isVerified) {
      return { success: false, errorKey: 'account_not_verified' };
    }

    try {
      localStorage.setItem(SESSION_EMAIL_KEY, user.email);
      setCurrentUserEmail(user.email);
      setCurrentUserName(user.name);
      setCurrentUserAvatarUrl(user.avatarUrl || null); // Set avatar URL on login
      setIsAuthenticated(true);
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      console.error("Fel vid inloggning och sparande till localStorage:", error);
      return { success: false, errorKey: 'generic_error' };
    }
  }, [router]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(SESSION_EMAIL_KEY);
      } catch (error) {
        console.error("Fel vid borttagning av session från localStorage:", error);
      }
    }
    setCurrentUserEmail(null);
    setCurrentUserName(null);
    setCurrentUserAvatarUrl(null); // Clear avatar URL on logout
    setIsAuthenticated(false);
    router.push('/login'); 
  }, [router]);
  
  const signup = useCallback(async (email?: string, password?: string, name?: string): Promise<SignupResult> => {
    if (!email || !password || !name) return { success: false, messageKey: 'generic_error' };
    if (typeof window === 'undefined') return { success: false, messageKey: 'generic_error' };

    const users = getUsersFromStorage();
    const existingUser = users.find(u => u.email === email);
    const verificationToken = uuidv4();

    if (existingUser) {
      if (existingUser.isDeleted) {
        // Allow re-signup for a deleted account, effectively overwriting it
        const updatedUsers = users.map(u => 
          u.email === email 
          ? { ...u, passwordHash: password, name, isVerified: false, verificationToken, isDeleted: false, createdAt: new Date().toISOString(), avatarUrl: u.avatarUrl || `https://picsum.photos/seed/${uuidv4()}/100/100` } 
          : u
        );
        saveUsersToStorage(updatedUsers);
        return { success: true, messageKey: 'verification_sent', verificationTokenForMock: verificationToken };
      } else if (!existingUser.isVerified) {
        // Resend verification for an unverified account
        const updatedUsers = users.map(u => 
          u.email === email 
          ? { ...u, verificationToken, name: name } // Update token and possibly name
          : u
        );
        saveUsersToStorage(updatedUsers);
        return { success: true, messageKey: 'verification_resent', verificationTokenForMock: verificationToken };
      } else {
        // Account already exists and is verified
        return { success: false, messageKey: 'already_registered' };
      }
    }

    // New user
    const newUser: StoredUser = {
      email,
      passwordHash: password, // Store plain text for mock
      name,
      isVerified: false,
      verificationToken,
      createdAt: new Date().toISOString(),
      avatarUrl: `https://picsum.photos/seed/${uuidv4()}/100/100`, // Default avatar
    };
    saveUsersToStorage([...users, newUser]);
    return { success: true, messageKey: 'verification_sent', verificationTokenForMock: verificationToken };
  }, []);

  const verifyEmail = useCallback(async (token: string): Promise<VerifyEmailResult> => {
    if (typeof window === 'undefined') return { success: false, errorKey: 'generic_error' };

    const users = getUsersFromStorage();
    const userIndex = users.findIndex(u => u.verificationToken === token && !u.isDeleted);

    if (userIndex === -1) {
      return { success: false, errorKey: 'invalid_token' };
    }
    
    const userToVerify = users[userIndex];
    if (userToVerify.isVerified) {
        return { success: true, errorKey: 'already_verified' }; 
    }

    users[userIndex] = { ...userToVerify, isVerified: true, verificationToken: undefined };
    saveUsersToStorage(users);
    return { success: true };
  }, []);

  const deleteAccount = useCallback(async () => {
    const emailToDelete = currentUserEmail; 
    if (typeof window !== 'undefined' && emailToDelete) {
      const users = getUsersFromStorage();
      const updatedUsers = users.map(u => 
        u.email === emailToDelete ? { ...u, isDeleted: true, isVerified: false, verificationToken: undefined } : u
      );
      saveUsersToStorage(updatedUsers);

      try {
        // Clear session
        localStorage.removeItem(SESSION_EMAIL_KEY);
        // Clear user-specific data
        localStorage.removeItem(`ekonova-boards-${emailToDelete}`);
        localStorage.removeItem(`ekonova-active-board-id-${emailToDelete}`);
        localStorage.removeItem(`ekonova-bills-${emailToDelete}`);
      } catch (error) {
        console.error("Kunde inte radera konto från localStorage:", error);
      }
    }
    setCurrentUserEmail(null);
    setCurrentUserName(null);
    setCurrentUserAvatarUrl(null);
    setIsAuthenticated(false);
    router.push('/login'); 
  }, [router, currentUserEmail]);

  const changePassword = useCallback(async (currentPassword?: string, newPassword?: string): Promise<ChangePasswordResult> => {
    if (!currentPassword || !newPassword) return { success: false, errorKey: 'generic_error' };
    if (typeof window === 'undefined' || !currentUserEmail) return { success: false, errorKey: 'generic_error' };

    const users = getUsersFromStorage();
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (userIndex === -1) return { success: false, errorKey: 'generic_error' }; // Should not happen if logged in

    if (users[userIndex].passwordHash !== currentPassword) { // Plain text check
      return { success: false, errorKey: 'invalid_current_password' };
    }

    users[userIndex].passwordHash = newPassword; // Update with new plain text password
    saveUsersToStorage(users);
    return { success: true };
  }, [currentUserEmail]);

  const updateProfilePicture = useCallback(async (imageDataUri: string): Promise<UpdateProfilePictureResult> => {
    if (typeof window === 'undefined' || !currentUserEmail) return { success: false, errorKey: 'generic_error' };

    const users = getUsersFromStorage();
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (userIndex === -1) return { success: false, errorKey: 'generic_error' };

    users[userIndex].avatarUrl = imageDataUri;
    saveUsersToStorage(users);
    setCurrentUserAvatarUrl(imageDataUri); // Update state immediately
    return { success: true };
  }, [currentUserEmail]);


  return (
    <MockAuthContext.Provider value={{ 
      isAuthenticated, 
      currentUserEmail, 
      currentUserName, 
      currentUserAvatarUrl,
      login, 
      logout, 
      signup, 
      deleteAccount, 
      verifyEmail, 
      changePassword,
      updateProfilePicture,
      isLoading 
    }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error('useMockAuth måste användas inom en MockAuthProvider');
  }
  return context;
}
