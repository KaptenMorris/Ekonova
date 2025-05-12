
"use client";

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Board, Category, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid'; // Keep for client-side generation if needed before Appwrite ID
import { ID, Databases, Query, AppwriteException } from 'appwrite';
import { databases, databaseId, boardsCollectionId } from '@/lib/appwrite';
import { INITIAL_BOARD_CATEGORY_TEMPLATES, DEFAULT_BOARD_NAME } from '@/config/constants';
import { useAuth } from '@/hooks/useMockAuth'; // Use the new Appwrite-based auth hook
import { useToast } from './use-toast';

// Appwrite typically returns documents with system attributes ($id, $createdAt, etc.)
// Extend our types or handle the mapping
interface AppwriteBoardDocument extends Omit<Board, 'id'> {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
    userId: string; // Add userId field for ownership
    categories: string; // Store as JSON string
    transactions: string; // Store as JSON string
    sharedWith?: string; // Store as JSON string
}


interface BoardsContextType {
  boards: Board[];
  activeBoard: Board | null;
  activeBoardId: string | null;
  isLoadingBoards: boolean;
  setActiveBoardId: (boardId: string | null) => void;
  addBoard: (name: string) => Promise<Board | null>;
  renameBoard: (boardId: string, newName: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  shareBoard: (boardId: string, email: string) => Promise<void>; // Sharing logic needs review with Appwrite permissions
  unshareBoard: (boardId: string, email: string) => Promise<void>; // Sharing logic needs review with Appwrite permissions
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

  // Helper to map Appwrite document to frontend Board type
  const mapDocumentToBoard = (doc: AppwriteBoardDocument): Board => {
      try {
        const categories = JSON.parse(doc.categories || '[]') as Category[];
        const transactions = JSON.parse(doc.transactions || '[]') as Transaction[];
        const sharedWith = JSON.parse(doc.sharedWith || '[]') as string[];
        return {
            id: doc.$id,
            name: doc.name,
            categories: categories,
            transactions: transactions,
            createdAt: doc.$createdAt,
            sharedWith: sharedWith,
            userId: doc.userId,
            // Include other fields if necessary
        };
      } catch (e) {
          console.error(`Error parsing data for board ${doc.$id}:`, e);
           toast({ title: "Fel", description: `Kunde inte ladda data korrekt för tavlan "${doc.name}".`, variant: "destructive" });
          // Return a default/empty state for this board to avoid crashing
          return {
            id: doc.$id,
            name: doc.name + " (Laddningsfel)",
            categories: [],
            transactions: [],
            createdAt: doc.$createdAt,
            sharedWith: [],
            userId: doc.userId,
          };
      }

  };

  // Fetch boards from Appwrite
  const fetchBoards = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setBoards([]);
      setActiveBoardIdState(null);
      setInternalIsLoadingBoards(false);
      return;
    }
    setInternalIsLoadingBoards(true);
    try {
      const response = await databases.listDocuments(
        databaseId,
        boardsCollectionId,
        [Query.equal('userId', userId)] // Fetch boards belonging to the current user
      );
      const fetchedBoards = response.documents.map(doc => mapDocumentToBoard(doc as unknown as AppwriteBoardDocument));
      setBoards(fetchedBoards);

      // Determine active board
      const activeIdKey = `ekonova-active-board-id-${userId}`; // Keep active ID local for preference
       const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem(activeIdKey) : null;

      if (fetchedBoards.length === 0) {
        // No boards found, create the default one
        const defaultBoard = await addBoard(DEFAULT_BOARD_NAME); // addBoard handles saving to Appwrite
        if (defaultBoard && typeof window !== 'undefined') {
            localStorage.setItem(activeIdKey, defaultBoard.id); // Set newly created board as active
        }
      } else if (storedActiveId && fetchedBoards.some(b => b.id === storedActiveId)) {
        setActiveBoardIdState(storedActiveId);
      } else if (fetchedBoards.length > 0) {
        // Fallback to the first board if stored ID is invalid or missing
        setActiveBoardIdState(fetchedBoards[0].id);
        if (typeof window !== 'undefined') {
             localStorage.setItem(activeIdKey, fetchedBoards[0].id);
        }
      } else {
          setActiveBoardIdState(null); // Should be handled by the length === 0 case above
      }

    } catch (e) {
      console.error("Appwrite: Failed to fetch boards:", e);
      toast({ title: "Fel", description: "Kunde inte ladda dina tavlor.", variant: "destructive" });
      setBoards([]);
      setActiveBoardIdState(null);
    } finally {
      setInternalIsLoadingBoards(false);
    }
  }, [isAuthenticated, userId, toast]); // Removed addBoard from dependency array to break potential loop


  // Effect to load boards when auth state changes
  useEffect(() => {
    if (!isLoadingAuth) {
      fetchBoards();
    }
  }, [isAuthenticated, userId, isLoadingAuth, fetchBoards]);

  // Function to set active board ID (updates state and localStorage)
   const setActiveBoardId = useCallback((boardId: string | null) => {
    if (!isAuthenticated || !userId) return; // Only allow setting if authenticated

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

  // --- CRUD Operations ---

  const addBoard = useCallback(async (name: string): Promise<Board | null> => {
    if (!isAuthenticated || !userId) {
        toast({ title: "Åtkomst nekad", description: "Du måste vara inloggad för att skapa en tavla.", variant: "destructive" });
        return null;
    }
    setInternalIsLoadingBoards(true);
    const newCategories = INITIAL_BOARD_CATEGORY_TEMPLATES.map(template => ({
      ...template,
      id: uuidv4(), // Client-side ID generation for nested items
    }));

    const newBoardData = {
      userId: userId,
      name: name,
      categories: JSON.stringify(newCategories),
      transactions: JSON.stringify([]),
      sharedWith: JSON.stringify([]),
      // createdAt is handled by Appwrite ($createdAt)
    };

    try {
      const document = await databases.createDocument(
        databaseId,
        boardsCollectionId,
        ID.unique(), // Appwrite generates the document ID
        newBoardData
      );

      const newBoard = mapDocumentToBoard(document as unknown as AppwriteBoardDocument);
      setBoards(prevBoards => [...prevBoards, newBoard]);
      setActiveBoardId(newBoard.id); // Make the new board active
      setInternalIsLoadingBoards(false);
      toast({ title: "Tavla Skapad", description: `Tavlan "${name}" har skapats.` });
      return newBoard;
    } catch (e) {
      console.error("Appwrite: Failed to add board:", e);
      toast({ title: "Fel", description: "Kunde inte skapa tavlan.", variant: "destructive" });
      setInternalIsLoadingBoards(false);
      return null;
    }
  }, [isAuthenticated, userId, toast, setActiveBoardId]);


  const renameBoard = useCallback(async (boardId: string, newName: string) => {
    if (!isAuthenticated || !userId) return;
    setInternalIsLoadingBoards(true);
     const originalBoards = [...boards]; // Backup for optimistic revert
     // Optimistic UI Update
     setBoards(prevBoards =>
       prevBoards.map(board =>
         board.id === boardId ? { ...board, name: newName } : board
       )
     );

    try {
      await databases.updateDocument(
        databaseId,
        boardsCollectionId,
        boardId,
        { name: newName }
      );
       toast({ title: "Tavla Omdöpt", description: `Tavlan har döpts om till "${newName}".` });
    } catch (e) {
      console.error("Appwrite: Failed to rename board:", e);
      toast({ title: "Fel", description: "Kunde inte döpa om tavlan.", variant: "destructive" });
      setBoards(originalBoards); // Revert optimistic update on error
    } finally {
        setInternalIsLoadingBoards(false);
    }
  }, [isAuthenticated, userId, boards, toast]);

  const deleteBoard = useCallback(async (boardId: string) => {
    if (!isAuthenticated || !userId) return;
    setInternalIsLoadingBoards(true);
    const boardToDelete = boards.find(b => b.id === boardId);
    const originalBoards = [...boards]; // Backup for optimistic revert

     // Optimistic UI Update
     const updatedBoardsOptimistic = boards.filter(board => board.id !== boardId);
     setBoards(updatedBoardsOptimistic);

     // Handle active board change after optimistic delete
      if (activeBoardId === boardId) {
        if (updatedBoardsOptimistic.length > 0) {
            setActiveBoardId(updatedBoardsOptimistic[0].id);
        } else {
            setActiveBoardId(null); // No boards left, clear activeId
        }
      }


    try {
      await databases.deleteDocument(
        databaseId,
        boardsCollectionId,
        boardId
      );
      toast({ title: "Tavla Raderad", description: `Tavlan "${boardToDelete?.name || boardId}" har raderats.` });
      // If delete is successful, optimistic update is final.
      // If no boards remain, trigger creation of a default one
      if (updatedBoardsOptimistic.length === 0) {
          await addBoard(DEFAULT_BOARD_NAME); // This will set the new default as active
      }

    } catch (e) {
      console.error("Appwrite: Failed to delete board:", e);
      toast({ title: "Fel", description: "Kunde inte radera tavlan.", variant: "destructive" });
      // Revert optimistic update on error
      setBoards(originalBoards);
      // Also revert active board ID if it was changed optimistically
       if (activeBoardId === boardId) {
            setActiveBoardId(boardId); // Set it back
       }

    } finally {
        setInternalIsLoadingBoards(false);
    }
  }, [isAuthenticated, userId, boards, activeBoardId, setActiveBoardId, toast, addBoard]); // Add addBoard dependency

  // --- Modify Active Board Helper ---
   const modifyActiveBoard = useCallback(async (updateFn: (board: Board) => Partial<AppwriteBoardDocument> | null): Promise<Board | null> => {
    if (!isAuthenticated || !userId || !activeBoardId) return null;

    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (!currentBoard) return null;

    const updateData = updateFn(currentBoard);
    if (!updateData) return currentBoard; // No changes needed

     const originalBoards = [...boards]; // Backup
      // Optimistic Update
     let updatedBoardOptimistic: Board | null = null;
     setBoards(prevBoards =>
       prevBoards.map(board => {
         if (board.id === activeBoardId) {
           // Apply changes locally for UI update
            updatedBoardOptimistic = mapDocumentToBoard({
                ...currentBoard, // Existing board data
                 $id: currentBoard.id, // mapDocument needs $id
                 userId: userId, // Need userId
                 // Apply the *parsed* update data back
                 name: updateData.name ?? currentBoard.name,
                 categories: updateData.categories ?? JSON.stringify(currentBoard.categories),
                 transactions: updateData.transactions ?? JSON.stringify(currentBoard.transactions),
                 sharedWith: updateData.sharedWith ?? JSON.stringify(currentBoard.sharedWith ?? []),
                 // Dummy values for system fields needed by mapDocumentToBoard
                 $createdAt: currentBoard.createdAt,
                 $updatedAt: new Date().toISOString(),
                 $permissions: [],
            });
           return updatedBoardOptimistic;
         }
         return board;
       })
     );


    try {
        setInternalIsLoadingBoards(true); // Indicate loading during Appwrite call
        const updatedDoc = await databases.updateDocument(
            databaseId,
            boardsCollectionId,
            activeBoardId,
            updateData
        );
         // Update local state with the confirmed data from Appwrite
         const confirmedBoard = mapDocumentToBoard(updatedDoc as unknown as AppwriteBoardDocument);
         setBoards(prevBoards => prevBoards.map(b => b.id === confirmedBoard.id ? confirmedBoard : b));
         setInternalIsLoadingBoards(false);
         return confirmedBoard;

    } catch (e) {
      console.error("Appwrite: Failed to update active board:", e);
      toast({ title: "Fel", description: "Kunde inte uppdatera tavlan.", variant: "destructive" });
      setBoards(originalBoards); // Revert optimistic update
      setInternalIsLoadingBoards(false);
      return null;
    }
   }, [isAuthenticated, userId, activeBoardId, boards, toast]);


  // --- Category and Transaction Operations (using modifyActiveBoard) ---

  const addCategoryToActiveBoard = useCallback(async (categoryData: Omit<Category, 'id'>): Promise<Category | null> => {
     if (!isAuthenticated || !userId || !activeBoardId) return null;
     const newCategory: Category = {
       ...categoryData,
       id: uuidv4(), // Generate ID client-side
       icon: categoryData.icon || 'Archive'
     };
      let resultCategory: Category | null = null;
      await modifyActiveBoard(board => {
        const updatedCategories = [...board.categories, newCategory];
        resultCategory = newCategory; // Capture the category being added
        return { categories: JSON.stringify(updatedCategories) };
      });
      if(resultCategory) {
         toast({ title: "Kategori Tillagd", description: `"${newCategory.name}" har lagts till.` });
      }
      return resultCategory; // Return the added category (with generated ID)
  }, [isAuthenticated, userId, activeBoardId, modifyActiveBoard, toast]);

  const deleteCategoryFromActiveBoard = useCallback(async (categoryId: string) => {
     if (!isAuthenticated || !userId || !activeBoardId) return;
     let categoryName = '';
     await modifyActiveBoard(board => {
        const categoryToDelete = board.categories.find(c => c.id === categoryId);
        categoryName = categoryToDelete?.name || categoryId;
        const updatedCategories = board.categories.filter(c => c.id !== categoryId);
        const updatedTransactions = board.transactions.filter(t => t.categoryId !== categoryId);
        return {
            categories: JSON.stringify(updatedCategories),
            transactions: JSON.stringify(updatedTransactions)
        };
     });
     toast({ title: "Kategori Raderad", description: `"${categoryName}" och dess transaktioner har tagits bort.` });
  }, [isAuthenticated, userId, activeBoardId, modifyActiveBoard, toast]);

  const addTransactionToActiveBoard = useCallback(async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction | null> => {
    if (!isAuthenticated || !userId || !activeBoardId) return null;
    const newTransaction: Transaction = { ...transactionData, id: uuidv4() };
     let resultTransaction: Transaction | null = null;
    await modifyActiveBoard(board => {
        const updatedTransactions = [...board.transactions, newTransaction];
        resultTransaction = newTransaction;
        return { transactions: JSON.stringify(updatedTransactions) };
    });
    if (resultTransaction) {
         toast({ title: "Transaktion Tillagd", description: `"${newTransaction.title}" har lagts till.` });
    }
    return resultTransaction;
  }, [isAuthenticated, userId, activeBoardId, modifyActiveBoard, toast]);

  const updateTransactionInActiveBoard = useCallback(async (updatedTransaction: Transaction): Promise<Transaction | null> => {
     if (!isAuthenticated || !userId || !activeBoardId) return null;
     let resultTransaction: Transaction | null = null;
     await modifyActiveBoard(board => {
        const updatedTransactions = board.transactions.map(t =>
            t.id === updatedTransaction.id ? updatedTransaction : t
        );
        resultTransaction = updatedTransaction;
        return { transactions: JSON.stringify(updatedTransactions) };
     });
      if (resultTransaction) {
         toast({ title: "Transaktion Uppdaterad", description: `"${updatedTransaction.title}" har uppdaterats.` });
     }
     return resultTransaction;
  }, [isAuthenticated, userId, activeBoardId, modifyActiveBoard, toast]);

  const deleteTransactionFromActiveBoard = useCallback(async (transactionId: string) => {
     if (!isAuthenticated || !userId || !activeBoardId) return;
     let transactionTitle = '';
     await modifyActiveBoard(board => {
        const txToDelete = board.transactions.find(t => t.id === transactionId);
        transactionTitle = txToDelete?.title || transactionId;
        const updatedTransactions = board.transactions.filter(t => t.id !== transactionId);
        return { transactions: JSON.stringify(updatedTransactions) };
     });
      toast({ title: "Transaktion Raderad", description: `"${transactionTitle}" har tagits bort.` });
  }, [isAuthenticated, userId, activeBoardId, modifyActiveBoard, toast]);


 // --- Sharing (Placeholder/Mock - Requires backend/permissions setup in Appwrite) ---
  const shareBoard = useCallback(async (boardId: string, email: string) => {
     if (!isAuthenticated || !userId) return;
      // Appwrite sharing involves setting document permissions, which is complex and usually requires backend logic or careful client-side permission setup.
      // This mock implementation just updates the 'sharedWith' array optimistically.
     console.warn("Appwrite sharing logic not fully implemented. Mocking sharedWith update.");
     toast({ title: "Delning (Demo)", description: `Tavlan skulle delas med ${email}. Kräver Appwrite permissions-setup.`, variant: "default" });

     await modifyActiveBoard(board => {
         // Ensure sharedWith is always an array before spreading
         const currentSharedWith = Array.isArray(board.sharedWith) ? board.sharedWith : [];
         if (!currentSharedWith.includes(email)) {
             const updatedSharedWith = [...currentSharedWith, email];
             return { sharedWith: JSON.stringify(updatedSharedWith) };
         }
         return null; // No change needed if already shared
     });
  }, [isAuthenticated, userId, modifyActiveBoard, toast]);

  const unshareBoard = useCallback(async (boardId: string, email: string) => {
     if (!isAuthenticated || !userId) return;
     console.warn("Appwrite unsharing logic not fully implemented. Mocking sharedWith update.");
      toast({ title: "Avdelning (Demo)", description: `Delning med ${email} skulle tas bort. Kräver Appwrite permissions-setup.`, variant: "default" });

     await modifyActiveBoard(board => {
         const currentSharedWith = Array.isArray(board.sharedWith) ? board.sharedWith : [];
         const updatedSharedWith = currentSharedWith.filter(e => e !== email);
          // Only return update data if the array actually changed
         if (updatedSharedWith.length !== currentSharedWith.length) {
            return { sharedWith: JSON.stringify(updatedSharedWith) };
         }
         return null; // No change needed
     });
  }, [isAuthenticated, userId, modifyActiveBoard, toast]);


  // --- Context Value ---
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

    