
"use client";

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Board, Category, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { INITIAL_BOARD_CATEGORY_TEMPLATES, DEFAULT_BOARD_NAME } from '@/config/constants';
import { useMockAuth } from './useMockAuth';

interface BoardsContextType {
  boards: Board[];
  activeBoard: Board | null;
  activeBoardId: string | null;
  isLoadingBoards: boolean;
  setActiveBoardId: (boardId: string) => void;
  addBoard: (name: string) => Board;
  renameBoard: (boardId: string, newName: string) => void;
  deleteBoard: (boardId: string) => void;
  shareBoard: (boardId: string, email: string) => void;
  unshareBoard: (boardId: string, email: string) => void;
  addCategoryToActiveBoard: (categoryData: Omit<Category, 'id'>) => Category | null;
  deleteCategoryFromActiveBoard: (categoryId: string) => void;
  addTransactionToActiveBoard: (transactionData: Omit<Transaction, 'id'>) => Transaction | null;
  updateTransactionInActiveBoard: (updatedTransaction: Transaction) => Transaction | null;
  deleteTransactionFromActiveBoard: (transactionId: string) => void;
}

const BoardsContext = createContext<BoardsContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUserEmail, isLoading: isLoadingAuth } = useMockAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardIdState] = useState<string | null>(null);
  const [internalIsLoadingBoards, setInternalIsLoadingBoards] = useState(true);

  const getStorageKeys = useCallback((email: string | null) => {
    if (!email) return { boardsKey: null, activeBoardIdKey: null };
    return {
      boardsKey: `ekonova-boards-${email}`,
      activeBoardIdKey: `ekonova-active-board-id-${email}`,
    };
  }, []);

  const createDefaultBoardForUser = useCallback((boardsKey: string, activeBoardIdKey: string): Board => {
    const defaultCategories = INITIAL_BOARD_CATEGORY_TEMPLATES.map(template => ({
      ...template,
      id: uuidv4(),
    }));
    const defaultBoard: Board = {
      id: uuidv4(),
      name: DEFAULT_BOARD_NAME,
      categories: defaultCategories,
      transactions: [],
      createdAt: new Date().toISOString(),
      sharedWith: [],
    };
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(boardsKey, JSON.stringify([defaultBoard]));
            localStorage.setItem(activeBoardIdKey, defaultBoard.id);
        } catch (error) {
            console.error("Kunde inte spara standardtavla till localStorage:", error);
        }
    }
    return defaultBoard;
  }, []);


  useEffect(() => {
    if (isLoadingAuth || typeof window === 'undefined') {
      setInternalIsLoadingBoards(true);
      return;
    }

    if (!isAuthenticated || !currentUserEmail) {
      setBoards([]);
      setActiveBoardIdState(null);
      setInternalIsLoadingBoards(false);
      return;
    }

    setInternalIsLoadingBoards(true);
    const { boardsKey, activeBoardIdKey } = getStorageKeys(currentUserEmail);

    if (!boardsKey || !activeBoardIdKey) {
        setInternalIsLoadingBoards(false);
        return;
    }

    try {
      const storedBoards = localStorage.getItem(boardsKey);
      const storedActiveBoardId = localStorage.getItem(activeBoardIdKey);
      let currentBoards: Board[] = [];

      if (storedBoards) {
        currentBoards = JSON.parse(storedBoards);
      }
      
      if (currentBoards.length === 0) {
        const defaultBoard = createDefaultBoardForUser(boardsKey, activeBoardIdKey);
        currentBoards = [defaultBoard];
        setActiveBoardIdState(defaultBoard.id);
      } else if (storedActiveBoardId && currentBoards.find(b => b.id === storedActiveBoardId)) {
        setActiveBoardIdState(storedActiveBoardId);
      } else if (currentBoards.length > 0) {
        setActiveBoardIdState(currentBoards[0].id);
        localStorage.setItem(activeBoardIdKey, currentBoards[0].id); // Ensure activeId is saved if falling back
      }
      setBoards(currentBoards);
    } catch (error) {
      console.error("Kunde inte komma åt localStorage för tavlor:", error);
      // Fallback: create a default board if localStorage fails during read
      const defaultBoard = createDefaultBoardForUser(boardsKey, activeBoardIdKey);
      setBoards([defaultBoard]);
      setActiveBoardIdState(defaultBoard.id);
    } finally {
      setInternalIsLoadingBoards(false);
    }
  }, [isAuthenticated, currentUserEmail, isLoadingAuth, getStorageKeys, createDefaultBoardForUser]);

  const saveBoards = useCallback((updatedBoards: Board[]) => {
    if (!isAuthenticated || !currentUserEmail || typeof window === 'undefined') return;
    const { boardsKey } = getStorageKeys(currentUserEmail);
    if (!boardsKey) return;

    setBoards(updatedBoards);
    try {
        localStorage.setItem(boardsKey, JSON.stringify(updatedBoards));
    } catch (error) {
        console.error("Kunde inte spara tavlor till localStorage:", error);
    }
  }, [isAuthenticated, currentUserEmail, getStorageKeys]);

  const setActiveBoardId = useCallback((boardId: string | null) => {
    if (!isAuthenticated || !currentUserEmail || typeof window === 'undefined') {
        setActiveBoardIdState(null); // Clear active board if not authenticated
        return;
    }
    const { activeBoardIdKey } = getStorageKeys(currentUserEmail);
    if (!activeBoardIdKey) {
        setActiveBoardIdState(null);
        return;
    }
    
    setActiveBoardIdState(boardId);
    if (boardId) {
        try {
            localStorage.setItem(activeBoardIdKey, boardId);
        } catch (error) {
            console.error("Kunde inte spara aktivt tavle-ID till localStorage:", error);
        }
    } else {
        try {
            localStorage.removeItem(activeBoardIdKey);
        } catch (error) {
            console.error("Kunde inte ta bort aktivt tavle-ID från localStorage:", error);
        }
    }
  }, [isAuthenticated, currentUserEmail, getStorageKeys]);

  const addBoard = (name: string): Board => {
    if (!isAuthenticated || !currentUserEmail) {
        console.warn("Försök att lägga till tavla utan autentiserad användare.");
        // Return a non-functional board or throw error, UI should prevent this
        const tempId = uuidv4();
        return { id: tempId, name, categories: [], transactions: [], createdAt: new Date().toISOString(), sharedWith: [] };
    }

    const newCategories = INITIAL_BOARD_CATEGORY_TEMPLATES.map(template => ({
      ...template,
      id: uuidv4(),
    }));
    const newBoard: Board = {
      id: uuidv4(),
      name,
      categories: newCategories,
      transactions: [],
      createdAt: new Date().toISOString(),
      sharedWith: [],
    };
    const updatedBoards = [...boards, newBoard];
    saveBoards(updatedBoards);
    setActiveBoardId(newBoard.id);
    return newBoard;
  };

  const renameBoard = (boardId: string, newName: string) => {
    if (!isAuthenticated || !currentUserEmail) return;
    const updatedBoards = boards.map(board =>
      board.id === boardId ? { ...board, name: newName } : board
    );
    saveBoards(updatedBoards);
  };

  const deleteBoard = (boardId: string) => {
    if (!isAuthenticated || !currentUserEmail) return;
    const { boardsKey, activeBoardIdKey } = getStorageKeys(currentUserEmail);
    if (!boardsKey || !activeBoardIdKey) return;

    const updatedBoards = boards.filter(board => board.id !== boardId);
    saveBoards(updatedBoards);

    if (activeBoardId === boardId) {
      if (updatedBoards.length > 0) {
        setActiveBoardId(updatedBoards[0].id);
      } else {
        const defaultBoard = createDefaultBoardForUser(boardsKey, activeBoardIdKey);
        setBoards([defaultBoard]); // Explicitly set boards state after creation
        setActiveBoardId(defaultBoard.id);
      }
    }
  };
  
  const modifyActiveBoard = (updateFn: (board: Board) => Board): Board | null => {
    if (!isAuthenticated || !currentUserEmail || !activeBoardId) return null;
    let modifiedBoard: Board | null = null;
    const updatedBoards = boards.map(board => {
      if (board.id === activeBoardId) {
        modifiedBoard = updateFn(board);
        return modifiedBoard;
      }
      return board;
    });
    if (modifiedBoard) {
        saveBoards(updatedBoards);
    }
    return modifiedBoard;
  };

  const addCategoryToActiveBoard = (categoryData: Omit<Category, 'id'>): Category | null => {
    if (!isAuthenticated || !currentUserEmail) return null;
    const newCategory: Category = { 
        ...categoryData, 
        id: uuidv4(), 
        icon: categoryData.icon || 'Archive' // Default icon if not provided
    };
    let outcome: Category | null = null;
    modifyActiveBoard(board => {
      outcome = newCategory;
      return {
        ...board,
        categories: [...board.categories, newCategory],
      }
    });
    return outcome;
  };

  const deleteCategoryFromActiveBoard = (categoryId: string) => {
    if (!isAuthenticated || !currentUserEmail) return;
    modifyActiveBoard(board => {
      const updatedTransactions = board.transactions.filter(t => t.categoryId !== categoryId);
      const updatedCategories = board.categories.filter(c => c.id !== categoryId);
      return { ...board, categories: updatedCategories, transactions: updatedTransactions };
    });
  };

  const addTransactionToActiveBoard = (transactionData: Omit<Transaction, 'id'>): Transaction | null => {
    if (!isAuthenticated || !currentUserEmail) return null;
    const newTransaction: Transaction = { ...transactionData, id: uuidv4() };
    let outcome: Transaction | null = null;
    modifyActiveBoard(board => {
      outcome = newTransaction;
      return {
        ...board,
        transactions: [...board.transactions, newTransaction],
      }
    });
    return outcome;
  };
  
  const updateTransactionInActiveBoard = (updatedTransaction: Transaction): Transaction | null => {
    if (!isAuthenticated || !currentUserEmail) return null;
     let resultTransaction: Transaction | null = null;
     modifyActiveBoard(board => {
        const newTransactions = board.transactions.map(t => 
            t.id === updatedTransaction.id ? updatedTransaction : t
        );
        resultTransaction = updatedTransaction;
        return {...board, transactions: newTransactions };
     });
     return resultTransaction;
  };

  const deleteTransactionFromActiveBoard = (transactionId: string) => {
    if (!isAuthenticated || !currentUserEmail) return;
    modifyActiveBoard(board => ({
      ...board,
      transactions: board.transactions.filter(t => t.id !== transactionId),
    }));
  };

  const shareBoard = (boardId: string, email: string) => {
    if (!isAuthenticated || !currentUserEmail) return;
    // Logic for sharing is simplified for optimistic update and does not handle actual backend sharing
    const updatedBoards = boards.map(board => {
      if (board.id === boardId) {
        const newSharedWith = Array.isArray(board.sharedWith) ? [...board.sharedWith] : [];
        if (!newSharedWith.includes(email)) {
          newSharedWith.push(email);
        }
        return { ...board, sharedWith: newSharedWith };
      }
      return board;
    });
    saveBoards(updatedBoards);
  };

  const unshareBoard = (boardId: string, email: string) => {
    if (!isAuthenticated || !currentUserEmail) return;
    // Logic for unsharing is simplified
    const updatedBoards = boards.map(board => {
      if (board.id === boardId) {
        return { ...board, sharedWith: (board.sharedWith || []).filter(e => e !== email) };
      }
      return board;
    });
    saveBoards(updatedBoards);
  };


  const activeBoard = isAuthenticated && currentUserEmail && activeBoardId ? boards.find(b => b.id === activeBoardId) || null : null;
  const combinedIsLoading = isLoadingAuth || internalIsLoadingBoards;

  const contextValue: BoardsContextType = {
    boards: isAuthenticated && currentUserEmail ? boards : [],
    activeBoard,
    activeBoardId: isAuthenticated && currentUserEmail ? activeBoardId : null,
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
