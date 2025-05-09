"use client";

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Board, Category, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { INITIAL_BOARD_CATEGORY_TEMPLATES, DEFAULT_BOARD_NAME } from '@/config/constants';

const BOARDS_STORAGE_KEY = 'ekonova-boards';
const ACTIVE_BOARD_ID_STORAGE_KEY = 'ekonova-active-board-id';

interface BoardsContextType {
  boards: Board[];
  activeBoard: Board | null;
  activeBoardId: string | null;
  isLoadingBoards: boolean;
  setActiveBoardId: (boardId: string) => void;
  addBoard: (name: string) => Board;
  renameBoard: (boardId: string, newName: string) => void;
  deleteBoard: (boardId: string) => void;
  shareBoard: (boardId: string, email: string) => void; // Mocked
  unshareBoard: (boardId: string, email: string) => void; // Mocked
  addCategoryToActiveBoard: (categoryData: Omit<Category, 'id'>) => Category | null;
  deleteCategoryFromActiveBoard: (categoryId: string) => void;
  addTransactionToActiveBoard: (transactionData: Omit<Transaction, 'id'>) => Transaction | null;
  updateTransactionInActiveBoard: (updatedTransaction: Transaction) => Transaction | null;
  deleteTransactionFromActiveBoard: (transactionId: string) => void;
}

const BoardsContext = createContext<BoardsContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardIdState] = useState<string | null>(null);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedBoards = localStorage.getItem(BOARDS_STORAGE_KEY);
        const storedActiveBoardId = localStorage.getItem(ACTIVE_BOARD_ID_STORAGE_KEY);
        let currentBoards: Board[] = [];

        if (storedBoards) {
          currentBoards = JSON.parse(storedBoards);
        }
        
        if (currentBoards.length === 0) {
          // Create a default board if none exist
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
          currentBoards = [defaultBoard];
          localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(currentBoards));
          setActiveBoardIdState(defaultBoard.id);
          localStorage.setItem(ACTIVE_BOARD_ID_STORAGE_KEY, defaultBoard.id);
        } else if (storedActiveBoardId && currentBoards.find(b => b.id === storedActiveBoardId)) {
          setActiveBoardIdState(storedActiveBoardId);
        } else if (currentBoards.length > 0) {
          // Fallback to the first board if stored active ID is invalid or missing
          setActiveBoardIdState(currentBoards[0].id);
          localStorage.setItem(ACTIVE_BOARD_ID_STORAGE_KEY, currentBoards[0].id);
        }
        setBoards(currentBoards);
      } catch (error) {
        console.error("Could not access localStorage for boards:", error);
        // Fallback: create a default board if localStorage fails
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
        setBoards([defaultBoard]);
        setActiveBoardIdState(defaultBoard.id);
      } finally {
        setIsLoadingBoards(false);
      }
    }
  }, []);

  const saveBoards = useCallback((updatedBoards: Board[]) => {
    setBoards(updatedBoards);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(updatedBoards));
    }
  }, []);

  const setActiveBoardId = useCallback((boardId: string) => {
    setActiveBoardIdState(boardId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_BOARD_ID_STORAGE_KEY, boardId);
    }
  }, []);

  const addBoard = (name: string): Board => {
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
    setActiveBoardId(newBoard.id); // Optionally activate the new board
    return newBoard;
  };

  const renameBoard = (boardId: string, newName: string) => {
    const updatedBoards = boards.map(board =>
      board.id === boardId ? { ...board, name: newName } : board
    );
    saveBoards(updatedBoards);
  };

  const deleteBoard = (boardId: string) => {
    const updatedBoards = boards.filter(board => board.id !== boardId);
    saveBoards(updatedBoards);
    if (activeBoardId === boardId) {
      if (updatedBoards.length > 0) {
        setActiveBoardId(updatedBoards[0].id);
      } else {
        // If all boards are deleted, create a new default one
        const defaultBoard = addBoard(DEFAULT_BOARD_NAME);
        setActiveBoardId(defaultBoard.id);
      }
    }
  };
  
  const shareBoard = (boardId: string, email: string) => {
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
    const updatedBoards = boards.map(board => {
      if (board.id === boardId) {
        return { ...board, sharedWith: (board.sharedWith || []).filter(e => e !== email) };
      }
      return board;
    });
    saveBoards(updatedBoards);
  };

  const modifyActiveBoard = (updateFn: (board: Board) => Board): Board | null => {
    if (!activeBoardId) return null;
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
    const newCategory: Category = { ...categoryData, id: uuidv4() };
    modifyActiveBoard(board => ({
      ...board,
      categories: [...board.categories, newCategory],
    }));
    return newCategory;
  };

  const deleteCategoryFromActiveBoard = (categoryId: string) => {
    modifyActiveBoard(board => {
      // Also delete transactions associated with this category within this board
      const updatedTransactions = board.transactions.filter(t => t.categoryId !== categoryId);
      const updatedCategories = board.categories.filter(c => c.id !== categoryId);
      return { ...board, categories: updatedCategories, transactions: updatedTransactions };
    });
  };

  const addTransactionToActiveBoard = (transactionData: Omit<Transaction, 'id'>): Transaction | null => {
    const newTransaction: Transaction = { ...transactionData, id: uuidv4() };
    modifyActiveBoard(board => ({
      ...board,
      transactions: [...board.transactions, newTransaction],
    }));
    return newTransaction;
  };
  
  const updateTransactionInActiveBoard = (updatedTransaction: Transaction): Transaction | null => {
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
    modifyActiveBoard(board => ({
      ...board,
      transactions: board.transactions.filter(t => t.id !== transactionId),
    }));
  };

  const activeBoard = boards.find(b => b.id === activeBoardId) || null;

  return (
    <BoardsContext.Provider value={{
      boards,
      activeBoard,
      activeBoardId,
      isLoadingBoards,
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
    }}>
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards() {
  const context = useContext(BoardsContext);
  if (context === undefined) {
    throw new Error('useBoards must be used within a BoardProvider');
  }
  return context;
}
