
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

interface MockAuthContextType {
  isAuthenticated: boolean;
  currentUserEmail: string | null;
  currentUserName: string | null;
  login: (email?: string, password?: string) => void;
  logout: () => void;
  signup: (email?: string, password?: string, name?: string) => void;
  deleteAccount: () => void;
  isLoading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ekonova_auth_status';
const AUTH_USER_EMAIL_KEY = 'ekonova_auth_user_email';
const AUTH_USER_NAME_KEY = 'ekonova_auth_user_name';


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

        if (storedAuthStatus === 'true' && storedUserEmail) {
          setIsAuthenticated(true);
          setCurrentUserEmail(storedUserEmail);
          if (storedUserName) {
            setCurrentUserName(storedUserName);
          } else {
            // Fallback if name is missing but email exists
            setCurrentUserName(storedUserEmail.split('@')[0]); 
          }
        } else {
          // Ensure consistency: clear all if auth status is not true or email is missing
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_EMAIL_KEY);
          localStorage.removeItem(AUTH_USER_NAME_KEY);
        }
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((email?: string, _password?: string) => {
    if (typeof window !== 'undefined' && email) {
      try {
        const storedUserName = localStorage.getItem(AUTH_USER_NAME_KEY); // Check if a name was stored from a previous signup
        const nameToSet = storedUserName || email.split('@')[0]; // Use stored name or derive from email

        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
        localStorage.setItem(AUTH_USER_NAME_KEY, nameToSet); // Store/update name on login
        
        setCurrentUserEmail(email);
        setCurrentUserName(nameToSet);
        setIsAuthenticated(true);
        router.push('/dashboard');
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
        // Fallback if localStorage fails
        const nameToSet = email.split('@')[0];
        setCurrentUserEmail(email);
        setCurrentUserName(nameToSet);
        setIsAuthenticated(true);
        router.push('/dashboard');
      }
    } else if (email) { 
        const nameToSet = email.split('@')[0];
        setCurrentUserEmail(email);
        setCurrentUserName(nameToSet);
        setIsAuthenticated(true);
        router.push('/dashboard');
    }
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
  
  const signup = useCallback((email?: string, _password?: string, name?: string) => {
     if (typeof window !== 'undefined' && email && name) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
        localStorage.setItem(AUTH_USER_NAME_KEY, name);

        setCurrentUserEmail(email);
        setCurrentUserName(name);
        setIsAuthenticated(true);
        router.push('/dashboard');
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
        setCurrentUserEmail(email);
        setCurrentUserName(name);
        setIsAuthenticated(true);
        router.push('/dashboard');
      }
    } else if (email && name) {
        setCurrentUserEmail(email);
        setCurrentUserName(name);
        setIsAuthenticated(true);
        router.push('/dashboard');
    }
  }, [router]);

  const deleteAccount = useCallback(() => {
    const userEmail = currentUserEmail; // Capture current user's email before clearing state
    if (typeof window !== 'undefined' && userEmail) {
      try {
        // Clear auth specific keys
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_EMAIL_KEY);
        localStorage.removeItem(AUTH_USER_NAME_KEY);
        
        // Clear app-specific data for this user
        localStorage.removeItem(`ekonova-boards-${userEmail}`);
        localStorage.removeItem(`ekonova-active-board-id-${userEmail}`);
        localStorage.removeItem(`ekonova-bills-${userEmail}`);

        // Optionally, iterate through all localStorage keys if there's a pattern
        // for user-specific data that isn't explicitly listed above.
        // Example:
        // Object.keys(localStorage).forEach(key => {
        //   if (key.includes(userEmail)) { // Be careful with this pattern
        //     localStorage.removeItem(key);
        //   }
        // });

      } catch (error) {
        console.error("Kunde inte radera konto från localStorage:", error);
      }
    }
    setCurrentUserEmail(null);
    setCurrentUserName(null);
    setIsAuthenticated(false);
    router.push('/login'); // Redirect to login after deletion
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

