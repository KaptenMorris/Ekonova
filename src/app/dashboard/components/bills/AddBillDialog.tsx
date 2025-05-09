
"use client";

import type { Bill } from "@/types";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils"

interface AddBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBill: (bill: Omit<Bill, 'id' | 'isPaid' | 'paidDate'>) => void;
}

export function AddBillDialog({
  isOpen,
  onClose,
  onAddBill,
}: AddBillDialogProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setDueDate(new Date());
    setNotes("");
  };

  const handleSubmit = () => {
    if (!title || !amount || !dueDate) {
      alert("Vänligen fyll i titel, belopp och förfallodatum.");
      return;
    }
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Ogiltigt belopp. Ange ett positivt nummer.");
      return;
    }

    onAddBill({
      title,
      amount: numericAmount,
      dueDate: dueDate.toISOString(),
      notes,
    });
    resetForm();
    onClose();
  };
  
  const handleDialogClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleDialogClose();
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Lägg till Ny Räkning</DialogTitle>
          <DialogDescription>
            Fyll i detaljerna för din nya räkning.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title-add-bill" className="text-right">
              Titel
            </Label>
            <Input
              id="title-add-bill"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="t.ex., Hyra, Elräkning"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount-add-bill" className="text-right">
              Belopp (kr)
            </Label>
            <Input
              id="amount-add-bill"
              type="text" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="t.ex., 1500,00"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate-add-bill" className="text-right">
              Förfallodatum
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: sv }) : <span>Välj ett datum</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  locale={sv}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes-add-bill" className="text-right">
              Anteckningar
            </Label>
            <Textarea
              id="notes-add-bill"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Frivilliga anteckningar om räkningen"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleDialogClose}>
              Avbryt
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>Lägg till Räkning</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
