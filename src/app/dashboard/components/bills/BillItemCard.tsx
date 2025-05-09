
"use client";

import type { Bill } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Edit3, Trash2 } from "lucide-react";
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface BillItemCardProps {
  bill: Bill;
  onTogglePaid: (billId: string) => void;
  onDelete: (billId: string) => void;
  onEdit: (bill: Bill) => void; 
}

export function BillItemCard({ bill, onTogglePaid, onDelete, onEdit }: BillItemCardProps) {
  const formattedDueDate = bill.dueDate ? format(parseISO(bill.dueDate), "d MMM yyyy", { locale: sv }) : 'Okänt datum';
  const formattedPaidDate = bill.paidDate ? format(parseISO(bill.paidDate), "d MMM yyyy", { locale: sv }) : '';
  
  const isOverdue = !bill.isPaid && bill.dueDate && isPast(parseISO(bill.dueDate)) && differenceInDays(new Date(), parseISO(bill.dueDate)) > 0;

  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow duration-200", bill.isPaid ? "bg-secondary/30" : "bg-card", isOverdue && "border-destructive ring-2 ring-destructive/50")}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
        <div className="space-y-1">
          <CardTitle className={cn("text-base font-medium leading-none", bill.isPaid && "line-through text-muted-foreground")}>
            {bill.title}
          </CardTitle>
          <CardDescription className={cn("text-xs", bill.isPaid ? "text-muted-foreground" : "text-primary", isOverdue && "text-destructive font-semibold")}>
            Förfaller: {formattedDueDate}
            {isOverdue && " (Förfallen)"}
          </CardDescription>
          {bill.isPaid && formattedPaidDate && (
            <CardDescription className="text-xs text-green-600 dark:text-green-400">
              Betald: {formattedPaidDate}
            </CardDescription>
          )}
        </div>
        <div className="text-lg font-bold text-red-600 dark:text-red-400">
          {bill.amount.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {bill.notes && (
          <p className={cn("text-xs text-muted-foreground mb-3 break-words", bill.isPaid && "italic")}>{bill.notes}</p>
        )}
         <div className="flex items-center space-x-2 mb-3">
          <Checkbox
            id={`paid-${bill.id}`}
            checked={bill.isPaid}
            onCheckedChange={() => onTogglePaid(bill.id)}
            aria-label={bill.isPaid ? "Markera som obetald" : "Markera som betald"}
          />
          <Label htmlFor={`paid-${bill.id}`} className={cn("text-sm font-medium", bill.isPaid ? "text-muted-foreground" : "text-foreground")}>
            {bill.isPaid ? "Betald" : "Markera som Betald"}
          </Label>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-end space-x-2">
          {!bill.isPaid && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(bill)}>
              <Edit3 size={16} />
              <span className="sr-only">Redigera</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(bill.id)}>
            <Trash2 size={16} />
            <span className="sr-only">Radera</span>
          </Button>
      </CardFooter>
    </Card>
  );
}
