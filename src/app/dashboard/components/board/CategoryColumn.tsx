"use client";

import type { Category, Transaction } from "@/types";
import { TransactionItemCard } from "./TransactionItemCard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as LucideIcons from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface CategoryColumnProps {
  category: Category;
  transactions: Transaction[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export function CategoryColumn({ 
  category, 
  transactions, 
  onEditTransaction, 
  onDeleteTransaction,
  onDeleteCategory
}: CategoryColumnProps) {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const IconComponent = category.icon && LucideIcons[category.icon as keyof typeof LucideIcons] 
    ? LucideIcons[category.icon as keyof typeof LucideIcons] 
    : LucideIcons.Archive; // Default icon

  return (
    <Card className="min-w-[300px] max-w-[350px] h-full flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
        <div className="flex items-center gap-2">
          <IconComponent className={`h-6 w-6 ${category.type === 'income' ? 'text-green-500' : 'text-red-500'}`} />
          <CardTitle className="text-lg font-semibold">{category.name}</CardTitle>
        </div>
         <AlertDialog>
          <AlertDialogTrigger asChild>
             {(category.name !== "Income") && /* Prevent deleting default Income category for now */
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 size={16} />
              </Button>
            }
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will delete the category "{category.name}" and all its transactions. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDeleteCategory(category.id)} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[calc(100vh-300px)] md:h-[calc(100vh-280px)] p-4"> {/* Adjust height as needed */}
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <TransactionItemCard
                  key={transaction.id}
                  transaction={transaction}
                  categoryType={category.type}
                  onEdit={() => onEditTransaction(transaction)}
                  onDelete={() => onDeleteTransaction(transaction.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex justify-between w-full text-sm font-medium">
          <span>Total:</span>
          <span className={category.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {category.type === 'income' ? '+' : '-'}${Math.abs(totalAmount).toFixed(2)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
