"use client";

import type { Category, Transaction } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { CategoryColumn } from "./CategoryColumn";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutGrid, List } from "lucide-react";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
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


// Sample initial data
const initialCategories: Category[] = [
  { id: uuidv4(), name: "Income", type: "income", icon: "TrendingUp" },
  { id: uuidv4(), name: "Housing", type: "expense", icon: "Home" },
  { id: uuidv4(), name: "Food & Groceries", type: "expense", icon: "Utensils" },
  { id: uuidv4(), name: "Transportation", type: "expense", icon: "Car" },
  { id: uuidv4(), name: "Entertainment", type: "expense", icon: "Film" },
];

export function BoardView() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>("expense");

  // Persist data to localStorage
  useEffect(() => {
    const storedCategories = localStorage.getItem('ekonova-categories');
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    } else {
      setCategories(initialCategories); // Ensure initial data if nothing in LS
    }

    const storedTransactions = localStorage.getItem('ekonova-transactions');
    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ekonova-categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('ekonova-transactions', JSON.stringify(transactions));
  }, [transactions]);


  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions([...transactions, { ...transaction, id: uuidv4() }]);
  };

  const handleEditTransaction = (updatedTransaction: Transaction) => {
    setTransactions(
      transactions.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t))
    );
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions(transactions.filter((t) => t.id !== transactionId));
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() === "") return;
    const newCategory: Category = {
      id: uuidv4(),
      name: newCategoryName,
      type: newCategoryType,
      // icon: "Package" // Default icon or let user choose later
    };
    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setIsAddCategoryOpen(false);
  };
  
  const handleDeleteCategory = (categoryId: string) => {
    // Also delete transactions associated with this category
    setTransactions(prev => prev.filter(t => t.categoryId !== categoryId));
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };


  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);


  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Transaction Board</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddTransactionOpen(true)} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
          </Button>
           <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <List className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input 
                    id="categoryName" 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Utilities"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryType">Category Type</Label>
                   <Select value={newCategoryType} onValueChange={(value: 'income' | 'expense') => setNewCategoryType(value)}>
                    <SelectTrigger id="categoryType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddCategory}>Add Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {incomeCategories.map((category) => (
            <CategoryColumn
              key={category.id}
              category={category}
              transactions={transactions.filter((t) => t.categoryId === category.id)}
              onEditTransaction={openEditModal}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}
          {expenseCategories.map((category) => (
            <CategoryColumn
              key={category.id}
              category={category}
              transactions={transactions.filter((t) => t.categoryId === category.id)}
              onEditTransaction={openEditModal}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}
        </div>
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
