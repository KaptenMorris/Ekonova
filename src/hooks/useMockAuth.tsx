
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
  login: (email?: string, password?: string) => void;
  logout: () => void;
  signup: (email?: string, password?: string, name?: string) => void;
  isLoading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ekonova_auth_status';

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuthStatus = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuthStatus === 'true') {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Could not access localStorage:", error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((_email?: string, _password?: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } catch (error) {
        console.error("Could not access localStorage:", error);
      }
    }
    setIsAuthenticated(true);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (error) {
        console.error("Could not access localStorage:", error);
      }
    }
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);
  
  const signup = useCallback((_email?: string, _password?: string, _name?: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } catch (error) {
        console.error("Could not access localStorage:", error);
      }
    }
    setIsAuthenticated(true);
    router.push('/dashboard');
  }, [router]);

  return (
    <MockAuthContext.Provider value={{ isAuthenticated, login, logout, signup, isLoading }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
}
