
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
  login: (email?: string, password?: string) => void;
  logout: () => void;
  signup: (email?: string, password?: string, name?: string) => void;
  isLoading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ekonova_auth_status';
const AUTH_USER_EMAIL_KEY = 'ekonova_auth_user_email';

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuthStatus = localStorage.getItem(AUTH_STORAGE_KEY);
        const storedUserEmail = localStorage.getItem(AUTH_USER_EMAIL_KEY);
        if (storedAuthStatus === 'true' && storedUserEmail) {
          setIsAuthenticated(true);
          setCurrentUserEmail(storedUserEmail);
        } else {
          // Ensure consistency if one key exists but not the other
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_EMAIL_KEY);
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
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
        setCurrentUserEmail(email);
        setIsAuthenticated(true);
        router.push('/dashboard');
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
        // Fallback if localStorage fails, still set state for current session
        setCurrentUserEmail(email);
        setIsAuthenticated(true);
        router.push('/dashboard');
      }
    } else if (email) { // Handle case where window is not defined but email is passed (e.g. server initial state, though unlikely here)
        setCurrentUserEmail(email);
        setIsAuthenticated(true);
        router.push('/dashboard');
    }
  }, [router]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_EMAIL_KEY);
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
      }
    }
    setCurrentUserEmail(null);
    setIsAuthenticated(false);
    router.push('/login'); // Explicitly redirect to login on logout
  }, [router]);
  
  const signup = useCallback((email?: string, _password?: string, _name?: string) => {
     if (typeof window !== 'undefined' && email) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
        setCurrentUserEmail(email);
        setIsAuthenticated(true);
        router.push('/dashboard');
      } catch (error) {
        console.error("Kunde inte komma åt localStorage:", error);
        setCurrentUserEmail(email);
        setIsAuthenticated(true);
        router.push('/dashboard');
      }
    } else if (email) {
        setCurrentUserEmail(email);
        setIsAuthenticated(true);
        router.push('/dashboard');
    }
  }, [router]);

  return (
    <MockAuthContext.Provider value={{ isAuthenticated, currentUserEmail, login, logout, signup, isLoading }}>
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
