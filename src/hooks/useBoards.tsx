
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
  addCategoryToActiveBoard: (categoryData: Omit<Category, 'id' | 'order'>) => Promise<Category | null>;
  deleteCategoryFromActiveBoard: (categoryId: string) => Promise<void>;
  updateCategoryOrderInActiveBoard: (categoryId: string, direction: 'up' | 'down') => Promise<void>;
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
    const categoriesFromDoc = Array.isArray(docData.categories) ? docData.categories : [];
    const mappedCategories = categoriesFromDoc.map((c, index) => ({
      ...c,
      order: typeof c.order === 'number' ? c.order : index, // Assign order if missing, based on array index
    }));

    return {
      id: id,
      userId: docData.userId,
      name: docData.name,
      categories: mappedCategories,
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
        ...template, // template already includes order
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
        const newBoardForState = { ...newBoardData, id: docRef.id, createdAt: new Date().toISOString(), categories: newCategories }; 
        setBoards([newBoardForState]); 
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
      setInternalIsLoadingBoards(!isLoadingAuth); 
      return;
    }

    setInternalIsLoadingBoards(true);
    const boardsCollectionRef = collection(db, 'boards');
    const q = query(boardsCollectionRef, where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedBoards: Board[] = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push(mapFirestoreDocToBoard(doc.data(), doc.id));
      });
      setBoards(fetchedBoards);

      if (fetchedBoards.length === 0) {
        createDefaultBoardIfNeeded(fetchedBoards); 
      } else {
        const activeIdKey = `ekonova-active-board-id-${userId}`;
        const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem(activeIdKey) : null;
        if (storedActiveId && fetchedBoards.some(b => b.id === storedActiveId)) {
          setActiveBoardIdState(storedActiveId);
        } else if (fetchedBoards.length > 0) { // ensure fetchedBoards is not empty
          setActiveBoardIdState(fetchedBoards[0].id);
          if (typeof window !== 'undefined') localStorage.setItem(activeIdKey, fetchedBoards[0].id);
        } else {
          setActiveBoardIdState(null); // No boards, no active ID
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
      ...template, // template already includes order
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
      setActiveBoardIdInternal(docRef.id);
      toast({ title: "Tavla Skapad", description: `Tavlan "${name}" har skapats.` });
      return { ...newBoardData, id: docRef.id, createdAt: new Date().toISOString(), categories: newCategories }; 
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
          const remainingBoards = boards.filter(b => b.id !== boardId); 
          if (remainingBoards.length > 0) {
              setActiveBoardIdInternal(remainingBoards[0].id);
          } else {
              setActiveBoardIdInternal(null);
              await createDefaultBoardIfNeeded([]); 
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

  const addCategoryToActiveBoard = useCallback(async (categoryData: Omit<Category, 'id' | 'order'>): Promise<Category | null> => {
    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (!currentBoard) return null;

    const categoriesOfType = currentBoard.categories.filter(c => c.type === categoryData.type);
    const maxOrder = categoriesOfType.reduce((max, cat) => Math.max(max, cat.order), -1);

    const newCategory: Category = {
      ...categoryData,
      id: uuidv4(),
      icon: categoryData.icon || 'Archive',
      order: maxOrder + 1,
    };
    const success = await modifyActiveBoardArrayField('categories', current => [...current, newCategory]);
    if (success) {
      toast({ title: "Kategori Tillagd", description: `"${newCategory.name}" har lagts till.` });
      return newCategory;
    }
    return null;
  }, [modifyActiveBoardArrayField, toast, boards, activeBoardId]);

  const deleteCategoryFromActiveBoard = useCallback(async (categoryId: string) => {
    if (!activeBoardId) return;
    const board = boards.find(b => b.id === activeBoardId);
    if (!board) return;
    const catToDelete = board.categories.find(c => c.id === categoryId);
    const categoryName = catToDelete?.name || categoryId;

    const batch = writeBatch(db);
    const boardDocRef = doc(db, 'boards', activeBoardId);

    const updatedCategories = board.categories.filter(c => c.id !== categoryId);
    const updatedTransactions = board.transactions.filter(t => t.categoryId !== categoryId);
    
    batch.update(boardDocRef, { categories: updatedCategories, transactions: updatedTransactions });

    try {
      await batch.commit();
      toast({ title: "Kategori Raderad", description: `"${categoryName}" och dess transaktioner har tagits bort.` });
    } catch (error) {
      console.error("Firebase: Failed to delete category and its transactions:", error);
      toast({ title: "Fel", description: "Kunde inte radera kategorin.", variant: "destructive" });
    }
  }, [activeBoardId, boards, toast]);

  const updateCategoryOrderInActiveBoard = useCallback(async (categoryId: string, direction: 'up' | 'down') => {
    if (!isAuthenticated || !userId || !activeBoardId) return;

    const boardDocRef = doc(db, 'boards', activeBoardId);
    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (!currentBoard) return;

    const sourceCategoryGlobalIndex = currentBoard.categories.findIndex(c => c.id === categoryId);
    if (sourceCategoryGlobalIndex === -1) return;

    const sourceCategory = currentBoard.categories[sourceCategoryGlobalIndex];
    
    let categoriesOfType = currentBoard.categories
      .filter(c => c.type === sourceCategory.type)
      .sort((a, b) => a.order - b.order);

    const currentIndexInTypedList = categoriesOfType.findIndex(c => c.id === categoryId);

    let targetCategoryInTypedList: Category | undefined;

    if (direction === 'up') {
      if (currentIndexInTypedList === 0) return; 
      targetCategoryInTypedList = categoriesOfType[currentIndexInTypedList - 1];
    } else { 
      if (currentIndexInTypedList === categoriesOfType.length - 1) return; 
      targetCategoryInTypedList = categoriesOfType[currentIndexInTypedList + 1];
    }

    if (!targetCategoryInTypedList) return;

    const finalTargetCategory = currentBoard.categories.find(c => c.id === targetCategoryInTypedList!.id);
    if(!finalTargetCategory) return;

    const updatedAllCategories = currentBoard.categories.map(cat => {
      if (cat.id === sourceCategory.id) {
        return { ...cat, order: finalTargetCategory.order };
      }
      if (cat.id === finalTargetCategory.id) {
        return { ...cat, order: sourceCategory.order };
      }
      return cat;
    });

    try {
      await updateDoc(boardDocRef, { categories: updatedAllCategories });
    } catch (e) {
      console.error(`Firebase: Failed to update category order:`, e);
      toast({ title: "Fel", description: "Kunde inte uppdatera kategoriernas ordning.", variant: "destructive" });
    }

  }, [isAuthenticated, userId, activeBoardId, boards, toast]);

  const addTransactionToActiveBoard = useCallback(async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction | null> => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: uuidv4(),
      date: new Date(transactionData.date).toISOString(), 
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
     if (!activeBoardId) return;
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
    updateCategoryOrderInActiveBoard,
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
