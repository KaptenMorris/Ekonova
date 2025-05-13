
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
  Timestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { INITIAL_BOARD_CATEGORY_TEMPLATES, DEFAULT_BOARD_NAME } from '@/config/constants';
import { useAuth } from '@/hooks/useMockAuth'; // This will now use Firebase Auth
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
  shareBoard: (boardId: string, emailToShareWith: string) => Promise<void>; // Email for simplicity, UID is better
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
      categories: Array.isArray(docData.categories) ? docData.categories.map(c => ({...c})) : [],
      transactions: Array.isArray(docData.transactions) ? docData.transactions.map(t => ({
        ...t,
        date: t.date instanceof Timestamp ? t.date.toDate().toISOString() : t.date,
      })) : [],
      createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate().toISOString() : (docData.createdAt || new Date().toISOString()),
      sharedWith: Array.isArray(docData.sharedWith) ? docData.sharedWith : [],
    };
  };

  const setActiveBoardIdInternal = useCallback((boardId: string | null) => {
    setActiveBoardIdState(boardId);
    if (userId && typeof window !== 'undefined') {
      const activeIdKey = `ekonova-active-board-id-${userId}`;
      if (boardId) {
        localStorage.setItem(activeIdKey, boardId);
      } else {
        localStorage.removeItem(activeIdKey);
      }
    }
  }, [userId]);
  
  const createDefaultBoardIfNeeded = useCallback(async (currentBoards: Board[]): Promise<Board | null> => {
    if (currentBoards.length === 0 && userId && isAuthenticated) {
      const newCategories = INITIAL_BOARD_CATEGORY_TEMPLATES.map(template => ({
        ...template,
        id: uuidv4(),
      }));
      const newBoardData = {
        userId: userId,
        name: DEFAULT_BOARD_NAME,
        categories: newCategories,
        transactions: [],
        createdAt: serverTimestamp(),
        sharedWith: [],
      };
      try {
        const docRef = await addDoc(collection(db, 'boards'), newBoardData);
        // Don't map serverTimestamp() immediately, let onSnapshot pick up the resolved value.
        const newBoardForState = { ...newBoardData, id: docRef.id, createdAt: new Date().toISOString() }; // Temp for local state
        setBoards([newBoardForState]); // Update local state immediately for responsiveness
        setActiveBoardIdInternal(docRef.id);
        return newBoardForState;
      } catch (e) {
        console.error("Firebase: Failed to create default board:", e);
        toast({ title: "Fel", description: "Kunde inte skapa standardtavla.", variant: "destructive" });
        return null;
      }
    }
    return null;
  }, [userId, isAuthenticated, setActiveBoardIdInternal, toast]);


  useEffect(() => {
    if (!isAuthenticated || !userId || isLoadingAuth) {
      setBoards([]);
      setActiveBoardIdState(null);
      setInternalIsLoadingBoards(!isLoadingAuth); // True if auth is still loading, false otherwise
      return;
    }

    setInternalIsLoadingBoards(true);
    const boardsCollectionRef = collection(db, 'boards');
    // Query for boards owned by the user OR shared with the user (by email for now)
    // This requires composite indexes in Firestore if you query on multiple array fields
    // For simplicity, we'll start with just owned boards. Sharing query needs more setup.
    const q = query(boardsCollectionRef, where('userId', '==', userId));
    // TODO: Add query for sharedWith array-contains currentUserEmail if implementing sharing that way

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedBoards: Board[] = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push(mapFirestoreDocToBoard(doc.data(), doc.id));
      });
      setBoards(fetchedBoards);

      if (fetchedBoards.length === 0) {
        createDefaultBoardIfNeeded(fetchedBoards); // Will set active board if created
      } else {
        const activeIdKey = `ekonova-active-board-id-${userId}`;
        const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem(activeIdKey) : null;
        if (storedActiveId && fetchedBoards.some(b => b.id === storedActiveId)) {
          setActiveBoardIdState(storedActiveId);
        } else {
          setActiveBoardIdState(fetchedBoards[0].id);
          if (typeof window !== 'undefined') localStorage.setItem(activeIdKey, fetchedBoards[0].id);
        }
      }
      setInternalIsLoadingBoards(false);
    }, (error) => {
      console.error("Firebase: Failed to fetch boards:", error);
      toast({ title: "Fel", description: "Kunde inte ladda dina tavlor.", variant: "destructive" });
      setInternalIsLoadingBoards(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, userId, isLoadingAuth, toast, createDefaultBoardIfNeeded]);


  const addBoard = useCallback(async (name: string): Promise<Board | null> => {
    if (!isAuthenticated || !userId) {
      toast({ title: "Åtkomst nekad", description: "Du måste vara inloggad.", variant: "destructive" });
      return null;
    }
    setInternalIsLoadingBoards(true);
    const newCategories = INITIAL_BOARD_CATEGORY_TEMPLATES.map(template => ({
      ...template,
      id: uuidv4(),
    }));
    const newBoardData = {
      userId: userId,
      name: name,
      categories: newCategories,
      transactions: [],
      createdAt: serverTimestamp(),
      sharedWith: [],
    };
    try {
      const docRef = await addDoc(collection(db, 'boards'), newBoardData);
      // onSnapshot will update, but for immediate feedback, we can set active board
      setActiveBoardIdInternal(docRef.id);
      toast({ title: "Tavla Skapad", description: `Tavlan "${name}" har skapats.` });
      // Return the conceptual new board; actual data comes from onSnapshot
      return { ...newBoardData, id: docRef.id, createdAt: new Date().toISOString() }; // Temp createdAt for return
    } catch (e) {
      console.error("Firebase: Failed to add board:", e);
      toast({ title: "Fel", description: "Kunde inte skapa tavlan.", variant: "destructive" });
      return null;
    } finally {
      setInternalIsLoadingBoards(false);
    }
  }, [isAuthenticated, userId, toast, setActiveBoardIdInternal]);

  const renameBoard = useCallback(async (boardId: string, newName: string) => {
    if (!isAuthenticated || !userId) return;
    const boardDocRef = doc(db, 'boards', boardId);
    try {
      await updateDoc(boardDocRef, { name: newName });
      toast({ title: "Tavla Omdöpt", description: `Tavlan har döpts om till "${newName}".` });
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
      if (activeBoardId === boardId) {
          const remainingBoards = boards.filter(b => b.id !== boardId); // Use current local state for immediate update
          if (remainingBoards.length > 0) {
              setActiveBoardIdInternal(remainingBoards[0].id);
          } else {
              setActiveBoardIdInternal(null);
              await createDefaultBoardIfNeeded([]); // Create new default if all are gone
          }
      }
    } catch (e) {
      console.error("Firebase: Failed to delete board:", e);
      toast({ title: "Fel", description: "Kunde inte radera tavlan.", variant: "destructive" });
    }
  }, [isAuthenticated, userId, boards, activeBoardId, setActiveBoardIdInternal, toast, createDefaultBoardIfNeeded]);

  const modifyActiveBoardArrayField = useCallback(async (
    fieldName: 'categories' | 'transactions',
    updateLogic: (currentArray: any[]) => any[]
  ): Promise<boolean> => {
    if (!isAuthenticated || !userId || !activeBoardId) return false;
    const boardDocRef = doc(db, 'boards', activeBoardId);
    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (!currentBoard) return false;

    const currentArray = (currentBoard[fieldName] as any[]) || [];
    const updatedArray = updateLogic(currentArray);

    try {
      await updateDoc(boardDocRef, { [fieldName]: updatedArray });
      return true;
    } catch (e) {
      console.error(`Firebase: Failed to update ${fieldName}:`, e);
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
    const board = boards.find(b => b.id === activeBoardId);
    const catToDelete = board?.categories.find(c => c.id === categoryId);
    const categoryName = catToDelete?.name || categoryId;

    const batch = writeBatch(db);
    const boardDocRef = doc(db, 'boards', activeBoardId!);

    const updatedCategories = board?.categories.filter(c => c.id !== categoryId) || [];
    const updatedTransactions = board?.transactions.filter(t => t.categoryId !== categoryId) || [];
    
    batch.update(boardDocRef, { categories: updatedCategories, transactions: updatedTransactions });

    try {
      await batch.commit();
      toast({ title: "Kategori Raderad", description: `"${categoryName}" och dess transaktioner har tagits bort.` });
    } catch (error) {
      console.error("Firebase: Failed to delete category and its transactions:", error);
      toast({ title: "Fel", description: "Kunde inte radera kategorin.", variant: "destructive" });
    }
  }, [activeBoardId, boards, toast]);

  const addTransactionToActiveBoard = useCallback(async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction | null> => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: uuidv4(),
      date: new Date(transactionData.date).toISOString(), // Ensure ISO string format
    };
    const success = await modifyActiveBoardArrayField('transactions', current => [...current, newTransaction]);
    if (success) {
      toast({ title: "Transaktion Tillagd", description: `"${newTransaction.title}" har lagts till.` });
      return newTransaction;
    }
    return null;
  }, [modifyActiveBoardArrayField, toast]);

  const updateTransactionInActiveBoard = useCallback(async (updatedTransaction: Transaction): Promise<Transaction | null> => {
    const transactionToUpdate: Transaction = {
        ...updatedTransaction,
        date: new Date(updatedTransaction.date).toISOString(),
    };
    const success = await modifyActiveBoardArrayField('transactions', current =>
      current.map(t => (t.id === transactionToUpdate.id ? transactionToUpdate : t))
    );
    if (success) {
      toast({ title: "Transaktion Uppdaterad", description: `"${transactionToUpdate.title}" har uppdaterats.` });
      return transactionToUpdate;
    }
    return null;
  }, [modifyActiveBoardArrayField, toast]);

  const deleteTransactionFromActiveBoard = useCallback(async (transactionId: string) => {
     const board = boards.find(b => b.id === activeBoardId);
     const txToDelete = board?.transactions.find(t => t.id === transactionId);
     const transactionTitle = txToDelete?.title || transactionId;

    const success = await modifyActiveBoardArrayField('transactions', current => current.filter(t => t.id !== transactionId));
     if (success) {
        toast({ title: "Transaktion Raderad", description: `"${transactionTitle}" har tagits bort.` });
     }
  }, [modifyActiveBoardArrayField, toast, boards, activeBoardId]);

  const shareBoard = useCallback(async (boardId: string, emailToShareWith: string) => {
    if (!isAuthenticated || !userId) return;
    const boardDocRef = doc(db, 'boards', boardId);
    try {
      // In a real app, you'd query for user by email to get their UID, then add UID.
      // For simplicity, storing email directly, but Firestore rules would need to handle this.
      await updateDoc(boardDocRef, { sharedWith: arrayUnion(emailToShareWith) });
      toast({ title: "Tavla Delad", description: `Försökte dela med ${emailToShareWith}. Åtkomst styrs av säkerhetsregler.` });
    } catch (e) {
      console.error("Firebase: Failed to share board:", e);
      toast({ title: "Fel", description: "Kunde inte dela tavlan.", variant: "destructive" });
    }
  }, [isAuthenticated, userId, toast]);

  const unshareBoard = useCallback(async (boardId: string, emailToUnshare: string) => {
    if (!isAuthenticated || !userId) return;
    const boardDocRef = doc(db, 'boards', boardId);
    try {
      await updateDoc(boardDocRef, { sharedWith: arrayRemove(emailToUnshare) });
      toast({ title: "Delning Borttagen", description: `Slutade dela med ${emailToUnshare}.` });
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
    setActiveBoardId: setActiveBoardIdInternal,
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
