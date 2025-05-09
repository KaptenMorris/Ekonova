
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

interface LoginResult {
  success: boolean;
  errorKey?: 'account_deleted' | 'generic_error';
}

interface SignupResult {
  success: boolean;
  errorKey?: 'generic_error';
}

interface MockAuthContextType {
  isAuthenticated: boolean;
  currentUserEmail: string | null;
  currentUserName: string | null;
  login: (email?: string, password?: string) => Promise<LoginResult>;
  logout: () => void;
  signup: (email?: string, password?: string, name?: string) => Promise<SignupResult>;
  deleteAccount: () => void;
  isLoading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ekonova_auth_status';
const AUTH_USER_EMAIL_KEY = 'ekonova_auth_user_email';
const AUTH_USER_NAME_KEY = 'ekonova_auth_user_name';
const DELETED_USERS_STORAGE_KEY = 'ekonova_deleted_users';


const getDeletedUsers = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const storedDeletedUsers = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    return storedDeletedUsers ? JSON.parse(storedDeletedUsers) : [];
  } catch (error) {
    console.error("Kunde inte hämta listan över raderade användare:", error);
    return [];
  }
};

const addDeletedUser = (email: string) => {
  if (typeof window === 'undefined') return;
  try {
    const users = getDeletedUsers();
    if (!users.includes(email)) {
      users.push(email);
      localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(users));
    }
  } catch (error) {
    console.error("Kunde inte lägga till raderad användare:", error);
  }
};

const removeDeletedUser = (email: string) => {
  if (typeof window === 'undefined') return;
  try {
    let users = getDeletedUsers();
    users = users.filter(u => u !== email);
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Kunde inte ta bort raderad användare från listan:", error);
  }
};


export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuthStatus = localStorage.getItem(AUTH_STORAGE_KEY);
        const storedUserEmail = localStorage.getItem(AUTH_USER_EMAIL_KEY);
        const storedUserName = localStorage.getItem(AUTH_USER_NAME_KEY);
        const deletedUsers = getDeletedUsers();

        if (storedAuthStatus === 'true' && storedUserEmail && !deletedUsers.includes(storedUserEmail)) {
          setIsAuthenticated(true);
          setCurrentUserEmail(storedUserEmail);
          if (storedUserName) {
            setCurrentUserName(storedUserName);
          } else {
            setCurrentUserName(storedUserEmail.split('@')[0]); 
          }
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_EMAIL_KEY);
          localStorage.removeItem(AUTH_USER_NAME_KEY);
          setIsAuthenticated(false);
          setCurrentUserEmail(null);
          setCurrentUserName(null);
        }
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email?: string, _password?: string): Promise<LoginResult> => {
    if (!email) return { success: false, errorKey: 'generic_error' };

    if (typeof window !== 'undefined') {
      const deletedUsers = getDeletedUsers();
      if (deletedUsers.includes(email)) {
        return { success: false, errorKey: 'account_deleted' };
      }

      try {
        const storedUserName = localStorage.getItem(AUTH_USER_NAME_KEY); 
        const nameToSet = storedUserName || email.split('@')[0]; 

        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
        localStorage.setItem(AUTH_USER_NAME_KEY, nameToSet); 
        
        setCurrentUserEmail(email);
        setCurrentUserName(nameToSet);
        setIsAuthenticated(true);
        router.push('/dashboard');
        return { success: true };
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
        return { success: false, errorKey: 'generic_error' };
      }
    }
    // Fallback for non-browser environments (should not happen with 'use client')
    return { success: false, errorKey: 'generic_error' };
  }, [router]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_EMAIL_KEY);
        localStorage.removeItem(AUTH_USER_NAME_KEY);
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
      }
    }
    setCurrentUserEmail(null);
    setCurrentUserName(null);
    setIsAuthenticated(false);
    router.push('/login'); 
  }, [router]);
  
  const signup = useCallback(async (email?: string, _password?: string, name?: string): Promise<SignupResult> => {
     if (!email || !name) return { success: false, errorKey: 'generic_error'};
     
     if (typeof window !== 'undefined') {
      removeDeletedUser(email); // Allow re-signup by removing from deleted list
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
        localStorage.setItem(AUTH_USER_NAME_KEY, name);

        setCurrentUserEmail(email);
        setCurrentUserName(name);
        setIsAuthenticated(true);
        router.push('/dashboard');
        return { success: true };
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
        return { success: false, errorKey: 'generic_error'};
      }
    }
    return { success: false, errorKey: 'generic_error'};
  }, [router]);

  const deleteAccount = useCallback(() => {
    const emailToDelete = currentUserEmail; 
    if (typeof window !== 'undefined' && emailToDelete) {
      addDeletedUser(emailToDelete); // Add to deleted list
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_EMAIL_KEY);
        localStorage.removeItem(AUTH_USER_NAME_KEY);
        localStorage.removeItem(`ekonova-boards-${emailToDelete}`);
        localStorage.removeItem(`ekonova-active-board-id-${emailToDelete}`);
        localStorage.removeItem(`ekonova-bills-${emailToDelete}`);
      } catch (error) {
        console.error("Kunde inte radera konto från localStorage:", error);
      }
    }
    setCurrentUserEmail(null);
    setCurrentUserName(null);
    setIsAuthenticated(false);
    router.push('/login'); 
  }, [router, currentUserEmail]);


  return (
    <MockAuthContext.Provider value={{ isAuthenticated, currentUserEmail, currentUserName, login, logout, signup, deleteAccount, isLoading }}>
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
