"use client";

import type { Category, Transaction } from "@/types";
import { useState } from "react";
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
import { format } from "date-fns"
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils"

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Category[]; // Categories for the active board
}

export function AddTransactionDialog({
  isOpen,
  onClose,
  onAddTransaction,
  categories,
}: AddTransactionDialogProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!title || !amount || !date || !categoryId) {
      alert("Vänligen fyll i alla obligatoriska fält.");
      return;
    }
    const numericAmount = parseFloat(amount.replace(',', '.')); 
    if (isNaN(numericAmount)) {
      alert("Ogiltigt belopp.");
      return;
    }

    onAddTransaction({
      title,
      amount: numericAmount,
      date: date.toISOString(),
      categoryId,
      description,
    });
    // Reset form and close
    setTitle("");
    setAmount("");
    setDate(new Date());
    setCategoryId("");
    setDescription("");
    onClose();
  };
  
  const handleClose = () => {
    // Reset form fields when dialog is closed, not just on submit
    setTitle("");
    setAmount("");
    setDate(new Date());
    setCategoryId("");
    setDescription("");
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose(); else onClose(); // Call handleClose if dialog is being closed
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Lägg till Ny Transaktion</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title-add-trans" className="text-right">
              Titel
            </Label>
            <Input
              id="title-add-trans"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="t.ex., Lön, Matvaror"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount-add-trans" className="text-right">
              Belopp
            </Label>
            <Input
              id="amount-add-trans"
              type="text" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="t.ex., 50.00"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date-add-trans" className="text-right">
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
            <Label htmlFor="category-add-trans" className="text-right">
              Kategori
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="col-span-3" id="category-add-trans">
                <SelectValue placeholder="Välj en kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type === 'income' ? 'Inkomst' : 'Utgift'})
                  </SelectItem>
                )) : <SelectItem value="no-cat" disabled>Inga kategorier tillgängliga</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description-add-trans" className="text-right">
              Beskrivning
            </Label>
            <Textarea
              id="description-add-trans"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Frivilliga detaljer om transaktionen"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose}>
              Avbryt
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>Lägg till Transaktion</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
