
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Bill } from '@/types';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useMockAuth';
import { useToast } from './use-toast';

interface BillsContextType {
  bills: Bill[];
  isLoadingBills: boolean;
  addBill: (billData: Omit<Bill, 'id' | 'userId'>) => Promise<Bill | null>; // Updated signature
  toggleBillPaidStatus: (billId: string) => Promise<Bill | null>;
  deleteBill: (billId: string) => Promise<void>;
  updateBill: (updatedBillData: Bill) => Promise<Bill | null>;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export function BillProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userId, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [internalIsLoadingBills, setInternalIsLoadingBills] = useState(true);

  const mapFirestoreDocToBill = (docData: any, id: string): Bill => ({
    id: id,
    userId: docData.userId,
    title: docData.title,
    amount: docData.amount,
    dueDate: docData.dueDate instanceof Timestamp ? docData.dueDate.toDate().toISOString() : docData.dueDate,
    isPaid: docData.isPaid,
    paidDate: docData.paidDate instanceof Timestamp ? docData.paidDate.toDate().toISOString() : (docData.paidDate || null),
    notes: docData.notes || "",
    categoryId: docData.categoryId,
  });

  useEffect(() => {
    if (!isAuthenticated || !userId || isLoadingAuth) {
      setBills([]);
      setInternalIsLoadingBills(!isLoadingAuth);
      return;
    }
    setInternalIsLoadingBills(true);
    const billsCollectionRef = collection(db, 'bills');
    const q = query(billsCollectionRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedBills: Bill[] = [];
      querySnapshot.forEach((doc) => {
        fetchedBills.push(mapFirestoreDocToBill(doc.data(), doc.id));
      });
      setBills(fetchedBills);
      setInternalIsLoadingBills(false);
    }, (error) => {
      console.error("Firebase: Failed to fetch bills:", error);
      toast({ title: "Fel", description: "Kunde inte ladda dina räkningar.", variant: "destructive" });
      setInternalIsLoadingBills(false);
    });
    return () => unsubscribe();
  }, [isAuthenticated, userId, isLoadingAuth, toast]);

  const addBill = useCallback(async (billData: Omit<Bill, 'id' | 'userId'>): Promise<Bill | null> => {
    if (!isAuthenticated || !userId) {
      toast({ title: "Åtkomst nekad", description: "Du måste vara inloggad.", variant: "destructive" });
      return null;
    }
     if (!billData.categoryId) {
        toast({ title: "Fel", description: "Kategori måste väljas för räkningen.", variant: "destructive" });
        return null;
    }
    setInternalIsLoadingBills(true);

    // billData now contains isPaid and potentially paidDate (as string from client)
    const newBillDataForFirestore = {
      ...billData, // Includes title, amount, dueDate (string), notes, categoryId, isPaid, paidDate (string|null)
      userId: userId,
      dueDate: Timestamp.fromDate(new Date(billData.dueDate)),
      // Convert paidDate to Timestamp only if it exists and isPaid is true
      paidDate: billData.isPaid && billData.paidDate ? Timestamp.fromDate(new Date(billData.paidDate)) : null,
      createdAt: serverTimestamp(), 
    };

    try {
      const docRef = await addDoc(collection(db, 'bills'), newBillDataForFirestore);
      // Return the conceptual new bill; actual data comes from onSnapshot
      // The returned bill should reflect what was intended to be saved, with dates as strings.
      return {
        ...billData, // This includes isPaid and paidDate (as string from client)
        id: docRef.id,
        userId: userId,
        // Ensure dueDate and paidDate are strings in the returned object for client consistency
        dueDate: billData.dueDate, 
        paidDate: billData.paidDate,
      };
    } catch (e) {
      console.error("Firebase: Failed to add bill:", e);
      toast({ title: "Fel", description: "Kunde inte lägga till räkningen.", variant: "destructive" });
      return null;
    } finally {
      setInternalIsLoadingBills(false); // Or let onSnapshot handle this
    }
  }, [isAuthenticated, userId, toast]);

  const toggleBillPaidStatus = useCallback(async (billId: string): Promise<Bill | null> => {
    if (!isAuthenticated || !userId) return null;
    const billToToggle = bills.find(b => b.id === billId);
    if (!billToToggle) return null;

    const newPaidStatus = !billToToggle.isPaid;
    const newPaidDate = newPaidStatus ? Timestamp.now() : null;
    
    const updatedData = {
      isPaid: newPaidStatus,
      paidDate: newPaidDate,
    };
    const billDocRef = doc(db, 'bills', billId);
    try {
      await updateDoc(billDocRef, updatedData);
      return { 
        ...billToToggle, 
        isPaid: newPaidStatus, 
        paidDate: newPaidDate ? newPaidDate.toDate().toISOString() : null 
      };
    } catch (e) {
      console.error("Firebase: Failed to toggle bill status:", e);
      toast({ title: "Fel", description: "Kunde inte uppdatera räkningens status.", variant: "destructive" });
      return null;
    }
  }, [isAuthenticated, userId, bills, toast]);

  const deleteBill = useCallback(async (billId: string) => {
    if (!isAuthenticated || !userId) return;
    const billDocRef = doc(db, 'bills', billId);
    try {
      await deleteDoc(billDocRef);
    } catch (e) {
      console.error("Firebase: Failed to delete bill:", e);
      toast({ title: "Fel", description: "Kunde inte radera räkningen.", variant: "destructive" });
    }
  }, [isAuthenticated, userId, toast]);

  const updateBill = useCallback(async (updatedBillData: Bill): Promise<Bill | null> => {
    if (!isAuthenticated || !userId) return null;
    const { id, userId: billUserId, ...dataToUpdate } = updatedBillData;
    const billDocRef = doc(db, 'bills', id);

    const firestoreReadyData: any = { // Use 'any' for flexibility or define a more specific type
        ...dataToUpdate,
        dueDate: Timestamp.fromDate(new Date(dataToUpdate.dueDate)),
        paidDate: dataToUpdate.isPaid && dataToUpdate.paidDate ? Timestamp.fromDate(new Date(dataToUpdate.paidDate)) : null,
    };
    delete firestoreReadyData.id; 

    try {
      await updateDoc(billDocRef, firestoreReadyData);
      return updatedBillData; 
    } catch (e) {
      console.error("Firebase: Failed to update bill:", e);
      toast({ title: "Fel", description: "Kunde inte uppdatera räkningen.", variant: "destructive" });
      return null;
    }
  }, [isAuthenticated, userId, toast]);

  const combinedIsLoading = isLoadingAuth || internalIsLoadingBills;

  const contextValue: BillsContextType = {
    bills: isAuthenticated ? bills : [],
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
