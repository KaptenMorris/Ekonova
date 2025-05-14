
"use client";

import type { Category, Transaction } from "@/types";
import { useState, useMemo } from "react";
import { useBoards } from "@/hooks/useBoards";
import { CategoryColumn } from "./CategoryColumn";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, List, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export function BoardView() {
  const { 
    activeBoard, 
    isLoadingBoards,
    addCategoryToActiveBoard, 
    deleteCategoryFromActiveBoard,
    updateCategoryOrderInActiveBoard, // Get the new function
    addTransactionToActiveBoard,
    updateTransactionInActiveBoard,
    deleteTransactionFromActiveBoard
  } = useBoards();

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>("expense");

  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    addTransactionToActiveBoard(transaction);
  };

  const handleEditTransaction = (updatedTransaction: Transaction) => {
    updateTransactionInActiveBoard(updatedTransaction);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    deleteTransactionFromActiveBoard(transactionId);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() === "") return;
    // Pass Omit<Category, 'id' | 'order'>
    addCategoryToActiveBoard({
      name: newCategoryName,
      type: newCategoryType,
      icon: "Archive" // Default icon, order will be assigned in useBoards
    });
    setNewCategoryName("");
    setNewCategoryType("expense"); // Reset to default
    setIsAddCategoryOpen(false);
  };
  
  const handleDeleteCategory = (categoryId: string) => {
    deleteCategoryFromActiveBoard(categoryId);
  };

  const categories = useMemo(() => activeBoard?.categories || [], [activeBoard]);
  const transactions = useMemo(() => activeBoard?.transactions || [], [activeBoard]);

  // Sort categories by their order property
  const incomeCategories = useMemo(() => 
    categories.filter(c => c.type === 'income').sort((a, b) => a.order - b.order), 
  [categories]);
  const expenseCategories = useMemo(() => 
    categories.filter(c => c.type === 'expense').sort((a, b) => a.order - b.order), 
  [categories]);

  if (isLoadingBoards) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeBoard) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <Alert variant="destructive" className="max-w-md">
                <AlertTitle>Ingen tavla vald</AlertTitle>
                <AlertDescription>
                    Välj en tavla från menyn ovan eller skapa en ny för att börja.
                </AlertDescription>
            </Alert>
        </div>
    );
  }


  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        {/* Title now comes from DashboardHeader based on active board name */}
        <div className="flex gap-2">
          <Button onClick={() => setIsAddTransactionOpen(true)} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Ny Transaktion
          </Button>
           <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <List className="mr-2 h-4 w-4" /> Ny Kategori
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lägg till Ny Kategori</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="categoryName">Kategorinamn</Label>
                  <Input 
                    id="categoryName" 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="t.ex., Räkningar"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryType">Kategorityp</Label>
                   <Select value={newCategoryType} onValueChange={(value: 'income' | 'expense') => setNewCategoryType(value)}>
                    <SelectTrigger id="categoryType">
                      <SelectValue placeholder="Välj typ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Inkomst</SelectItem>
                      <SelectItem value="expense">Utgift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Avbryt</Button>
                </DialogClose>
                <Button onClick={handleAddCategory}>Lägg till Kategori</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        {categories.length === 0 ? (
             <Alert>
                <AlertTitle>Dags att organisera!</AlertTitle>
                <AlertDescription>
                    Den här tavlan har inga kategorier än. Klicka på "Ny Kategori" för att lägga till din första.
                </AlertDescription>
            </Alert>
        ) : (
        <div className="flex min-w-max gap-4">
          {incomeCategories.map((category, index) => (
            <CategoryColumn
              key={category.id}
              category={category}
              transactions={transactions.filter((t) => t.categoryId === category.id)}
              onEditTransaction={openEditModal}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteCategory={handleDeleteCategory}
              onUpdateCategoryOrder={updateCategoryOrderInActiveBoard}
              isFirstInCategoryType={index === 0}
              isLastInCategoryType={index === incomeCategories.length - 1}
            />
          ))}
          {expenseCategories.map((category, index) => (
            <CategoryColumn
              key={category.id}
              category={category}
              transactions={transactions.filter((t) => t.categoryId === category.id)}
              onEditTransaction={openEditModal}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteCategory={handleDeleteCategory}
              onUpdateCategoryOrder={updateCategoryOrderInActiveBoard}
              isFirstInCategoryType={index === 0}
              isLastInCategoryType={index === expenseCategories.length - 1}
            />
          ))}
        </div>
        )}
      </div>
      
      <AddTransactionDialog
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onAddTransaction={handleAddTransaction}
        categories={categories}
      />

      {editingTransaction && (
        <EditTransactionDialog
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
          onEditTransaction={handleEditTransaction}
          categories={categories}
        />
      )}
    </div>
  );
}
