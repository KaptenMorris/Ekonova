
"use client";

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Board, Category, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp, // For Firestore Timestamps if needed
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { INITIAL_BOARD_CATEGORY_TEMPLATES, DEFAULT_BOARD_NAME } from '@/config/constants';
import { useAuth } from '@/hooks/useMockAuth';
import { useToast } from './use-toast';

interface BoardsContextType {
  boards: Board[];
  activeBoard: Board | null;
  activeBoardId: string | null;
  isLoadingBoards: boolean;
  setActiveBoardId: (boardId: string | null) => void;
  addBoard: (name: string) => Promise<Board | null>;
  renameBoard: (boardId: string, newName: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  shareBoard: (boardId: string, emailToShareWith: string) => Promise<void>;
  unshareBoard: (boardId: string, emailToUnshare: string) => Promise<void>;
  addCategoryToActiveBoard: (categoryData: Omit<Category, 'id'>) => Promise<Category | null>;
  deleteCategoryFromActiveBoard: (categoryId: string) => Promise<void>;
  addTransactionToActiveBoard: (transactionData: Omit<Transaction, 'id'>) => Promise<Transaction | null>;
  updateTransactionInActiveBoard: (updatedTransaction: Transaction) => Promise<Transaction | null>;
  deleteTransactionFromActiveBoard: (transactionId: string) => Promise<void>;
}

const BoardsContext = createContext<BoardsContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userId, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardIdState] = useState<string | null>(null);
  const [internalIsLoadingBoards, setInternalIsLoadingBoards] = useState(true);

  const mapFirestoreDocToBoard = (docData: any, id: string): Board => {
    return {
      id: id,
      userId: docData.userId,
      name: docData.name,
      // Ensure categories and transactions are arrays, default to empty if not present
      categories: Array.isArray(docData.categories) ? docData.categories : [],
      transactions: Array.isArray(docData.transactions) ? docData.transactions : [],
      createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate().toISOString() : (docData.createdAt || new Date().toISOString()),
      sharedWith: Array.isArray(docData.sharedWith) ? docData.sharedWith : [],
    };
  };

  const fetchBoards = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setBoards([]);
      setActiveBoardIdState(null);
      setInternalIsLoadingBoards(false);
      return () => {}; // Return an empty unsubscribe function
    }
    setInternalIsLoadingBoards(true);
    const boardsCollectionRef = collection(db, 'boards');
    const q = query(boardsCollectionRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedBoards: Board[] = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push(mapFirestoreDocToBoard(doc.data(), doc.id));
      });
      setBoards(fetchedBoards);

      const activeIdKey = `ekonova-active-board-id-${userId}`;
      const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem(activeIdKey) : null;

      if (fetchedBoards.length === 0 && !internalIsLoadingBoards) { // Only create default if not already loading (prevents race on initial load)
        const defaultBoard = await addBoard(DEFAULT_BOARD_NAME, true);
        if (defaultBoard && typeof window !== 'undefined') {
            localStorage.setItem(activeIdKey, defaultBoard.id);
        }
      } else if (storedActiveId && fetchedBoards.some(b => b.id === storedActiveId)) {
        setActiveBoardIdState(storedActiveId);
      } else if (fetchedBoards.length > 0) {
        setActiveBoardIdState(fetchedBoards[0].id);
        if (typeof window !== 'undefined') {
             localStorage.setItem(activeIdKey, fetchedBoards[0].id);
        }
      } else {
        setActiveBoardIdState(null);
      }
      setInternalIsLoadingBoards(false);
    }, (error) => {
      console.error("Firebase: Failed to fetch boards:", error);
      toast({ title: "Fel", description: "Kunde inte ladda dina tavlor.", variant: "destructive" });
      setInternalIsLoadingBoards(false);
    });

    return unsubscribe; // Return the unsubscribe function for cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, toast]); // addBoard removed for now

  useEffect(() => {
    let unsubscribe = () => {};
    if (!isLoadingAuth) {
      fetchBoards().then(unsub => unsubscribe = unsub);
    }
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [isLoadingAuth, fetchBoards]);


  const setActiveBoardId = useCallback((boardId: string | null) => {
    if (!isAuthenticated || !userId) return;
    setActiveBoardIdState(boardId);
    const activeIdKey = `ekonova-active-board-id-${userId}`;
    if (typeof window !== 'undefined') {
        try {
            if (boardId) {
                localStorage.setItem(activeIdKey, boardId);
            } else {
                localStorage.removeItem(activeIdKey);
            }
        } catch (error) {
            console.error("Could not save active board ID to localStorage:", error);
        }
    }
  }, [isAuthenticated, userId]);


  const addBoard = useCallback(async (name: string, isCreatingDefault = false): Promise<Board | null> => {
    if (!isAuthenticated || !userId) {
      toast({ title: "Åtkomst nekad", description: "Du måste vara inloggad.", variant: "destructive" });
      return null;
    }
    if (!isCreatingDefault) setInternalIsLoadingBoards(true);

    const newCategories = INITIAL_BOARD_CATEGORY_TEMPLATES.map(template => ({
      ...template,
      id: uuidv4(),
    }));

    const newBoardData = {
      userId: userId,
      name: name,
      categories: newCategories, // Store as array of objects
      transactions: [], // Store as array of objects
      createdAt: Timestamp.now(), // Use Firestore Timestamp
      sharedWith: [],
    };

    try {
      const docRef = await addDoc(collection(db, 'boards'), newBoardData);
      const newBoard = mapFirestoreDocToBoard(newBoardData, docRef.id); // Use newBoardData as it's what was written

      // No need to call setBoards here if onSnapshot is working correctly for initial load.
      // For immediate UI update if onSnapshot is slow or for the default board case:
      setBoards(prev => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);

      if (!isCreatingDefault) {
        toast({ title: "Tavla Skapad", description: `Tavlan "${name}" har skapats.` });
      }
      return newBoard;
    } catch (e) {
      console.error("Firebase: Failed to add board:", e);
      toast({ title: "Fel", description: "Kunde inte skapa tavlan.", variant: "destructive" });
      return null;
    } finally {
      if (!isCreatingDefault) setInternalIsLoadingBoards(false);
    }
  }, [isAuthenticated, userId, toast, setActiveBoardId]);


  const renameBoard = useCallback(async (boardId: string, newName: string) => {
    if (!isAuthenticated || !userId) return;
    const boardDocRef = doc(db, 'boards', boardId);
    try {
      await updateDoc(boardDocRef, { name: newName });
      toast({ title: "Tavla Omdöpt", description: `Tavlan har döpts om till "${newName}".` });
      // onSnapshot should update local state
    } catch (e) {
      console.error("Firebase: Failed to rename board:", e);
      toast({ title: "Fel", description: "Kunde inte döpa om tavlan.", variant: "destructive" });
    }
  }, [isAuthenticated, userId, toast]);

  const deleteBoard = useCallback(async (boardId: string) => {
    if (!isAuthenticated || !userId) return;
    const boardDocRef = doc(db, 'boards', boardId);
    const boardToDelete = boards.find(b => b.id === boardId);
    try {
      await deleteDoc(boardDocRef);
      toast({ title: "Tavla Raderad", description: `Tavlan "${boardToDelete?.name || boardId}" har raderats.` });
      // onSnapshot should handle state update and active board logic
      if (activeBoardId === boardId) { // If deleted board was active
          const remainingBoards = boards.filter(b => b.id !== boardId);
          if (remainingBoards.length > 0) {
              setActiveBoardId(remainingBoards[0].id);
          } else {
              setActiveBoardId(null);
              // Optionally create a new default board if none are left
              await addBoard(DEFAULT_BOARD_NAME, true);
          }
      }
    } catch (e) {
      console.error("Firebase: Failed to delete board:", e);
      toast({ title: "Fel", description: "Kunde inte radera tavlan.", variant: "destructive" });
    }
  }, [isAuthenticated, userId, boards, activeBoardId, setActiveBoardId, toast, addBoard]);


  const modifyActiveBoardArrayField = useCallback(async (
    fieldName: 'categories' | 'transactions' | 'sharedWith',
    updateLogic: (currentArray: any[]) => any[]
  ): Promise<boolean> => {
    if (!isAuthenticated || !userId || !activeBoardId) return false;

    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (!currentBoard) return false;

    const boardDocRef = doc(db, 'boards', activeBoardId);
    const currentArray = (currentBoard[fieldName] as any[]) || [];
    const updatedArray = updateLogic(currentArray);

    try {
      await updateDoc(boardDocRef, { [fieldName]: updatedArray });
      // onSnapshot will update local state, so explicit setBoards might not be needed
      // or could cause race conditions if not handled carefully with onSnapshot.
      return true;
    } catch (e) {
      console.error(`Firebase: Failed to update ${fieldName} for active board:`, e);
      toast({ title: "Fel", description: `Kunde inte uppdatera ${fieldName}.`, variant: "destructive" });
      return false;
    }
  }, [isAuthenticated, userId, activeBoardId, boards, toast]);


  const addCategoryToActiveBoard = useCallback(async (categoryData: Omit<Category, 'id'>): Promise<Category | null> => {
    const newCategory: Category = { ...categoryData, id: uuidv4(), icon: categoryData.icon || 'Archive' };
    const success = await modifyActiveBoardArrayField('categories', current => [...current, newCategory]);
    if (success) {
      toast({ title: "Kategori Tillagd", description: `"${newCategory.name}" har lagts till.` });
      return newCategory;
    }
    return null;
  }, [modifyActiveBoardArrayField, toast]);

  const deleteCategoryFromActiveBoard = useCallback(async (categoryId: string) => {
    let categoryName = '';
    // First, find the category to get its name for the toast message
    const board = boards.find(b => b.id === activeBoardId);
    const catToDelete = board?.categories.find(c => c.id === categoryId);
    categoryName = catToDelete?.name || categoryId;

    const success = await modifyActiveBoardArrayField('categories', current => current.filter(c => c.id !== categoryId));
    if (success) {
      // Also remove transactions associated with this category
      await modifyActiveBoardArrayField('transactions', current => current.filter(t => t.categoryId !== categoryId));
      toast({ title: "Kategori Raderad", description: `"${categoryName}" och dess transaktioner har tagits bort.` });
    }
  }, [modifyActiveBoardArrayField, toast, boards, activeBoardId]);

  const addTransactionToActiveBoard = useCallback(async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction | null> => {
    const newTransaction: Transaction = { ...transactionData, id: uuidv4() };
    const success = await modifyActiveBoardArrayField('transactions', current => [...current, newTransaction]);
    if (success) {
      toast({ title: "Transaktion Tillagd", description: `"${newTransaction.title}" har lagts till.` });
      return newTransaction;
    }
    return null;
  }, [modifyActiveBoardArrayField, toast]);

  const updateTransactionInActiveBoard = useCallback(async (updatedTransaction: Transaction): Promise<Transaction | null> => {
    const success = await modifyActiveBoardArrayField('transactions', current =>
      current.map(t => (t.id === updatedTransaction.id ? updatedTransaction : t))
    );
    if (success) {
      toast({ title: "Transaktion Uppdaterad", description: `"${updatedTransaction.title}" har uppdaterats.` });
      return updatedTransaction;
    }
    return null;
  }, [modifyActiveBoardArrayField, toast]);

  const deleteTransactionFromActiveBoard = useCallback(async (transactionId: string) => {
     let transactionTitle = '';
     const board = boards.find(b => b.id === activeBoardId);
     const txToDelete = board?.transactions.find(t => t.id === transactionId);
     transactionTitle = txToDelete?.title || transactionId;

    const success = await modifyActiveBoardArrayField('transactions', current => current.filter(t => t.id !== transactionId));
     if (success) {
        toast({ title: "Transaktion Raderad", description: `"${transactionTitle}" har tagits bort.` });
     }
  }, [modifyActiveBoardArrayField, toast, boards, activeBoardId]);

  const shareBoard = useCallback(async (boardId: string, emailToShareWith: string) => {
    // This is complex with Firestore and requires proper security rules.
    // Simple implementation: add email to 'sharedWith' array.
    // For actual access control, Firestore security rules must check this array.
    if (!isAuthenticated || !userId) return;
    const boardDocRef = doc(db, 'boards', boardId);
    try {
      // In a real app, you'd likely query for the user with 'emailToShareWith' to get their UID.
      // For this example, we'll just store the email. Security rules would be needed.
      await updateDoc(boardDocRef, {
        sharedWith: arrayUnion(emailToShareWith) // Adds email if not already present
      });
      toast({ title: "Tavla Delad (E-post)", description: `Försökte dela med ${emailToShareWith}. Faktisk åtkomst styrs av säkerhetsregler.` });
    } catch (e) {
      console.error("Firebase: Failed to share board:", e);
      toast({ title: "Fel", description: "Kunde inte dela tavlan.", variant: "destructive" });
    }
  }, [isAuthenticated, userId, toast]);

  const unshareBoard = useCallback(async (boardId: string, emailToUnshare: string) => {
    if (!isAuthenticated || !userId) return;
    const boardDocRef = doc(db, 'boards', boardId);
    try {
      await updateDoc(boardDocRef, {
        sharedWith: arrayRemove(emailToUnshare) // Removes all instances of email
      });
      toast({ title: "Delning Borttagen (E-post)", description: `Slutade dela med ${emailToUnshare}.` });
    } catch (e) {
      console.error("Firebase: Failed to unshare board:", e);
      toast({ title: "Fel", description: "Kunde inte ta bort delning.", variant: "destructive" });
    }
  }, [isAuthenticated, userId, toast]);

  const activeBoard = boards.find(b => b.id === activeBoardId) || null;
  const combinedIsLoading = isLoadingAuth || internalIsLoadingBoards;

  const contextValue: BoardsContextType = {
    boards: isAuthenticated ? boards : [],
    activeBoard,
    activeBoardId: isAuthenticated ? activeBoardId : null,
    isLoadingBoards: combinedIsLoading,
    setActiveBoardId,
    addBoard,
    renameBoard,
    deleteBoard,
    shareBoard,
    unshareBoard,
    addCategoryToActiveBoard,
    deleteCategoryFromActiveBoard,
    addTransactionToActiveBoard,
    updateTransactionInActiveBoard,
    deleteTransactionFromActiveBoard,
  };

  return (
    <BoardsContext.Provider value={contextValue}>
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards() {
  const context = useContext(BoardsContext);
  if (context === undefined) {
    throw new Error('useBoards måste användas inom en BoardProvider');
  }
  return context;
}
