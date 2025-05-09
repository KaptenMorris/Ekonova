
"use client";

import type { Transaction } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

interface TransactionItemCardProps {
  transaction: Transaction;
  categoryType: 'income' | 'expense';
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionItemCard({ transaction, categoryType, onEdit, onDelete }: TransactionItemCardProps) {
  const formattedDate = transaction.date ? format(parseISO(transaction.date), "d MMM yyyy", { locale: sv }) : 'Saknas';
  const amountColor = categoryType === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const amountPrefix = categoryType === 'income' ? '+' : '-';

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 bg-card">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium leading-none">{transaction.title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{formattedDate}</CardDescription>
        </div>
        <div className={`text-lg font-bold ${amountColor}`}>
          {amountPrefix}{Math.abs(transaction.amount).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {transaction.description && (
          <p className="text-xs text-muted-foreground mb-3 break-words">{transaction.description}</p>
        )}
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onEdit}>
            <Edit3 size={16} />
            <span className="sr-only">Redigera</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 size={16} />
            <span className="sr-only">Radera</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
