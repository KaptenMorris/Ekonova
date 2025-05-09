"use client";

import type { Category, Transaction } from "@/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils"

interface EditTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onEditTransaction: (transaction: Transaction) => void;
  categories: Category[];
}

export function EditTransactionDialog({
  isOpen,
  onClose,
  transaction,
  onEditTransaction,
  categories,
}: EditTransactionDialogProps) {
  const [title, setTitle] = useState(transaction.title);
  const [amount, setAmount] = useState(String(transaction.amount).replace('.', ',')); // Display with comma
  const [date, setDate] = useState<Date | undefined>(parseISO(transaction.date));
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [description, setDescription] = useState(transaction.description || "");

  useEffect(() => {
    setTitle(transaction.title);
    setAmount(String(transaction.amount).replace('.', ','));
    setDate(parseISO(transaction.date));
    setCategoryId(transaction.categoryId);
    setDescription(transaction.description || "");
  }, [transaction, isOpen]); // Re-populate form when transaction or isOpen changes

  const handleSubmit = () => {
    if (!title || !amount || !date || !categoryId) {
      alert("Vänligen fyll i alla obligatoriska fält.");
      return;
    }
    const numericAmount = parseFloat(amount.replace(',', '.')); // Parse with comma or dot
    if (isNaN(numericAmount)) {
      alert("Ogiltigt belopp.");
      return;
    }

    onEditTransaction({
      ...transaction,
      title,
      amount: numericAmount,
      date: date.toISOString(),
      categoryId,
      description,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Redigera Transaktion</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title-edit" className="text-right">
              Titel
            </Label>
            <Input
              id="title-edit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount-edit" className="text-right">
              Belopp
            </Label>
            <Input
              id="amount-edit"
              type="text" // Changed to text
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date-edit" className="text-right">
              Datum
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: sv }) : <span>Välj ett datum</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={sv}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category-edit" className="text-right">
              Kategori
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category-edit" className="col-span-3">
                <SelectValue placeholder="Välj en kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type === 'income' ? 'Inkomst' : 'Utgift'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description-edit" className="text-right">
              Beskrivning
            </Label>
            <Textarea
              id="description-edit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Avbryt
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>Spara Ändringar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
