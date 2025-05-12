
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Bill } from '@/types';
import { v4 as uuidv4 } from 'uuid'; // Keep for potential client-side ID needs before save
import { ID, Databases, Query, AppwriteException } from 'appwrite';
import { databases, databaseId, billsCollectionId } from '@/lib/appwrite';
import { useAuth } from './useAuth'; // Use the new Appwrite-based auth hook
import { useToast } from './use-toast';

// Appwrite document structure for Bills
interface AppwriteBillDocument extends Omit<Bill, 'id'> {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
    userId: string; // Add userId field for ownership
}

interface BillsContextType {
  bills: Bill[];
  isLoadingBills: boolean;
  addBill: (billData: Omit<Bill, 'id'>) => Promise<Bill | null>;
  toggleBillPaidStatus: (billId: string) => Promise<Bill | null>; // Return updated bill
  deleteBill: (billId: string) => Promise<void>;
  updateBill: (updatedBillData: Bill) => Promise<Bill | null>;
}

const BillsContext = createContext<BillsContextType | undefined>(undefined);

export function BillProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userId, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [internalIsLoadingBills, setInternalIsLoadingBills] = useState(true);

   // Helper to map Appwrite document to frontend Bill type
   const mapDocumentToBill = (doc: AppwriteBillDocument): Bill => ({
        id: doc.$id,
        title: doc.title,
        amount: doc.amount,
        dueDate: doc.dueDate,
        isPaid: doc.isPaid,
        paidDate: doc.paidDate,
        notes: doc.notes,
        categoryId: doc.categoryId,
        // Map other fields if necessary
   });


  // Fetch bills from Appwrite
  const fetchBills = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setBills([]);
      setInternalIsLoadingBills(false);
      return;
    }
    setInternalIsLoadingBills(true);
    try {
      const response = await databases.listDocuments(
        databaseId,
        billsCollectionId,
        [Query.equal('userId', userId)] // Fetch bills belonging to the current user
      );
      const fetchedBills = response.documents.map(doc => mapDocumentToBill(doc as unknown as AppwriteBillDocument));
      setBills(fetchedBills);
    } catch (e) {
      console.error("Appwrite: Failed to fetch bills:", e);
       if (!(e instanceof AppwriteException && e.code === 404)) { // Ignore collection not found initially maybe? Or handle creation elsewhere
           toast({ title: "Fel", description: "Kunde inte ladda dina räkningar.", variant: "destructive" });
       }
      setBills([]);
    } finally {
      setInternalIsLoadingBills(false);
    }
  }, [isAuthenticated, userId, toast]);

  // Effect to load bills when auth state changes
  useEffect(() => {
    if (!isLoadingAuth) {
        fetchBills();
    }
  }, [isAuthenticated, userId, isLoadingAuth, fetchBills]);

  // --- CRUD Operations ---

  const addBill = useCallback(async (billData: Omit<Bill, 'id'>): Promise<Bill | null> => {
    if (!isAuthenticated || !userId) {
        toast({ title: "Åtkomst nekad", description: "Du måste vara inloggad för att lägga till en räkning.", variant: "destructive" });
        return null;
    }
    // Ensure categoryId exists
    if (!billData.categoryId) {
        console.error("categoryId saknas när räkning läggs till.");
        toast({ title: "Fel", description: "Kategori måste väljas för räkningen.", variant: "destructive" });
        return null;
    }

    setIsLoading(true);
    const newBillDataForAppwrite = {
      ...billData,
      userId: userId,
      // isPaid is part of billData from the form/dialog call, should be false initially
    };

    try {
      const document = await databases.createDocument(
        databaseId,
        billsCollectionId,
        ID.unique(),
        newBillDataForAppwrite
      );

      const newBill = mapDocumentToBill(document as unknown as AppwriteBillDocument);
      setBills(prevBills => [...prevBills, newBill]);
      setIsLoading(false);
      toast({ title: "Räkning Tillagd", description: `"${newBill.title}" har lagts till.` });
      return newBill;
    } catch (e) {
      console.error("Appwrite: Failed to add bill:", e);
      toast({ title: "Fel", description: "Kunde inte lägga till räkningen.", variant: "destructive" });
      setIsLoading(false);
      return null;
    }
  }, [isAuthenticated, userId, toast]);


 const toggleBillPaidStatus = useCallback(async (billId: string): Promise<Bill | null> => {
    if (!isAuthenticated || !userId) return null;

    const billToToggle = bills.find(b => b.id === billId);
    if (!billToToggle) {
        toast({ title: "Fel", description: "Kunde inte hitta räkningen att uppdatera.", variant: "destructive" });
        return null;
    }

    setIsLoading(true);
    const originalBill = { ...billToToggle }; // Backup for optimistic revert
    const newPaidStatus = !billToToggle.isPaid;
    const updatedBillData = {
        isPaid: newPaidStatus,
        paidDate: newPaidStatus ? new Date().toISOString() : null, // Use null for Appwrite instead of undefined
    };

    // Optimistic UI Update
    let updatedBillOptimistic: Bill | null = null;
     setBills(prevBills =>
       prevBills.map(bill => {
           if (bill.id === billId) {
               updatedBillOptimistic = { ...bill, ...updatedBillData };
               return updatedBillOptimistic;
           }
           return bill;
       })
     );


    try {
      const updatedDoc = await databases.updateDocument(
        databaseId,
        billsCollectionId,
        billId,
        updatedBillData
      );
      const confirmedBill = mapDocumentToBill(updatedDoc as unknown as AppwriteBillDocument);
      // Update local state with confirmed data (might be redundant if optimistic was correct)
      setBills(prevBills => prevBills.map(b => b.id === confirmedBill.id ? confirmedBill : b));
      setIsLoading(false);
      // Toast is handled by the calling component (BillsPage) based on the outcome
      return confirmedBill;
    } catch (e) {
      console.error("Appwrite: Failed to toggle bill status:", e);
      toast({ title: "Fel", description: "Kunde inte uppdatera räkningens status.", variant: "destructive" });
      setBills(prevBills => prevBills.map(b => b.id === billId ? originalBill : b)); // Revert optimistic update
      setIsLoading(false);
      return null;
    }
  }, [isAuthenticated, userId, bills, toast]);


  const deleteBill = useCallback(async (billId: string) => {
    if (!isAuthenticated || !userId) return;
    const billToDelete = bills.find(b => b.id === billId);
    const originalBills = [...bills]; // Backup

    setIsLoading(true);
    // Optimistic UI Update
    setBills(prevBills => prevBills.filter(bill => bill.id !== billId));

    try {
      await databases.deleteDocument(
        databaseId,
        billsCollectionId,
        billId
      );
      setIsLoading(false);
      // Toast handled by BillsPage which calls this
    } catch (e) {
      console.error("Appwrite: Failed to delete bill:", e);
      toast({ title: "Fel", description: "Kunde inte radera räkningen.", variant: "destructive" });
      setBills(originalBills); // Revert optimistic update
      setIsLoading(false);
    }
  }, [isAuthenticated, userId, bills, toast]);


  const updateBill = useCallback(async (updatedBillData: Bill): Promise<Bill | null> => {
    if (!isAuthenticated || !userId) return null;
    const { id, ...dataToUpdate } = updatedBillData; // Separate ID from data

    const originalBill = bills.find(b => b.id === id);
    if (!originalBill) return null;

    setIsLoading(true);
    // Optimistic UI Update
    setBills(prevBills => prevBills.map(b => b.id === id ? updatedBillData : b));


    try {
      const updatedDoc = await databases.updateDocument(
        databaseId,
        billsCollectionId,
        id,
        {
            // Ensure only fields present in AppwriteBillDocument (excluding system fields and id) are sent
            userId: userId, // Already exists, but good practice to ensure it's correct if needed
            title: dataToUpdate.title,
            amount: dataToUpdate.amount,
            dueDate: dataToUpdate.dueDate,
            isPaid: dataToUpdate.isPaid,
            paidDate: dataToUpdate.paidDate || null, // Use null for Appwrite
            notes: dataToUpdate.notes,
            categoryId: dataToUpdate.categoryId,
        }
      );
      const confirmedBill = mapDocumentToBill(updatedDoc as unknown as AppwriteBillDocument);
       // Update state with confirmed data
       setBills(prevBills => prevBills.map(b => b.id === confirmedBill.id ? confirmedBill : b));
      setIsLoading(false);
      toast({ title: "Räkning Uppdaterad", description: `"${confirmedBill.title}" har uppdaterats.` });
      return confirmedBill;
    } catch (e) {
      console.error("Appwrite: Failed to update bill:", e);
      toast({ title: "Fel", description: "Kunde inte uppdatera räkningen.", variant: "destructive" });
      setBills(prevBills => prevBills.map(b => b.id === id ? originalBill : b)); // Revert optimistic update
      setIsLoading(false);
      return null;
    }
  }, [isAuthenticated, userId, bills, toast]);


  // --- Context Value ---
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
