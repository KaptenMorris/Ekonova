// src/hooks/useBills.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Bill } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useMockAuth } from './useMockAuth';

interface BillsContextType {
  bills: Bill[];
  isLoadingBills: boolean;
  addBill: (billData: Omit<Bill, 'id' | 'isPaid' | 'paidDate'>) => Bill | null;
  toggleBillPaidStatus: (billId: string) => Bill | undefined; // Return updated bill
  deleteBill: (billId: string) => void;
  updateBill: (updatedBill: Bill) => Bill | null;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export function BillProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUserEmail, isLoading: isLoadingAuth } = useMockAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [internalIsLoadingBills, setInternalIsLoadingBills] = useState(true);

  const getStorageKey = useCallback((email: string | null) => {
    if (!email) return null;
    return `ekonova-bills-${email}`;
  }, []);

  useEffect(() => {
    if (isLoadingAuth || typeof window === 'undefined') {
      setInternalIsLoadingBills(true);
      return;
    }

    if (!isAuthenticated || !currentUserEmail) {
      setBills([]);
      setInternalIsLoadingBills(false);
      return;
    }

    setInternalIsLoadingBills(true);
    const storageKey = getStorageKey(currentUserEmail);

    if (!storageKey) {
        setInternalIsLoadingBills(false);
        return;
    }

    try {
      const storedBills = localStorage.getItem(storageKey);
      if (storedBills) {
        setBills(JSON.parse(storedBills));
      } else {
        setBills([]); // Initialize with empty array if nothing stored
      }
    } catch (error) {
      console.error("Kunde inte komma åt localStorage för räkningar:", error);
      setBills([]); // Fallback to empty array on error
    } finally {
      setInternalIsLoadingBills(false);
    }
  }, [isAuthenticated, currentUserEmail, isLoadingAuth, getStorageKey]);

  const saveBills = useCallback((updatedBills: Bill[]) => {
    if (!isAuthenticated || !currentUserEmail || typeof window === 'undefined') return;
    const storageKey = getStorageKey(currentUserEmail);
    if (!storageKey) return;

    setBills(updatedBills);
    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedBills));
    } catch (error) {
        console.error("Kunde inte spara räkningar till localStorage:", error);
    }
  }, [isAuthenticated, currentUserEmail, getStorageKey]);

  const addBill = (billData: Omit<Bill, 'id' | 'isPaid' | 'paidDate'>): Bill | null => {
    if (!isAuthenticated || !currentUserEmail) {
        console.warn("Försök att lägga till räkning utan autentiserad användare.");
        return null;
    }
    const newBill: Bill = {
      ...billData,
      id: uuidv4(),
      isPaid: false,
    };
    const updatedBills = [...bills, newBill];
    saveBills(updatedBills);
    return newBill;
  };

  const toggleBillPaidStatus = (billId: string): Bill | undefined => {
    if (!isAuthenticated || !currentUserEmail) return undefined;
    let foundAndUpdatedBill: Bill | undefined = undefined;
    const updatedBills = bills.map(bill => {
      if (bill.id === billId) {
        const newPaidStatus = !bill.isPaid;
        foundAndUpdatedBill = {
          ...bill,
          isPaid: newPaidStatus,
          paidDate: newPaidStatus ? new Date().toISOString() : undefined,
        };
        return foundAndUpdatedBill;
      }
      return bill;
    });
    
    if (foundAndUpdatedBill) {
      saveBills(updatedBills);
    }
    return foundAndUpdatedBill;
  };

  const deleteBill = (billId: string) => {
    if (!isAuthenticated || !currentUserEmail) return;
    const updatedBills = bills.filter(bill => bill.id !== billId);
    saveBills(updatedBills);
  };
  
  const updateBill = (updatedBillData: Bill): Bill | null => {
    if (!isAuthenticated || !currentUserEmail) return null;
    let modifiedBill: Bill | null = null;
    const updatedBills = bills.map(bill => {
      if (bill.id === updatedBillData.id) {
        modifiedBill = { ...bill, ...updatedBillData }; // Ensure all properties of Bill are spread
        return modifiedBill;
      }
      return bill;
    });
    if (modifiedBill) {
      saveBills(updatedBills);
    }
    return modifiedBill;
  };

  const combinedIsLoading = isLoadingAuth || internalIsLoadingBills;

  const contextValue: BillsContextType = {
    bills: isAuthenticated && currentUserEmail ? bills : [],
    isLoadingBills: combinedIsLoading,
    addBill,
    toggleBillPaidStatus,
    deleteBill,
    updateBill,
  };

  return (
    <BillsContext.Provider value={contextValue}>
      {children}
    </BillsContext.Provider>
  );
}

export function useBills() {
  const context = useContext(BillsContext);
  if (context === undefined) {
    throw new Error('useBills måste användas inom en BillProvider');
  }
  return context;
}
