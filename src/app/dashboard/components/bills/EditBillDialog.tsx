
"use client";

import type { Bill } from "@/types";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils"

interface EditBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  onUpdateBill: (bill: Bill) => void;
}

export function EditBillDialog({
  isOpen,
  onClose,
  bill,
  onUpdateBill,
}: EditBillDialogProps) {
  const [title, setTitle] = useState(bill.title);
  const [amount, setAmount] = useState(String(bill.amount).replace('.', ','));
  const [dueDate, setDueDate] = useState<Date | undefined>(parseISO(bill.dueDate));
  const [notes, setNotes] = useState(bill.notes || "");

  useEffect(() => {
    if (isOpen) {
      setTitle(bill.title);
      setAmount(String(bill.amount).replace('.', ','));
      setDueDate(parseISO(bill.dueDate));
      setNotes(bill.notes || "");
    }
  }, [bill, isOpen]);

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

    onUpdateBill({
      ...bill,
      title,
      amount: numericAmount,
      dueDate: dueDate.toISOString(),
      notes,
    });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Redigera Räkning</DialogTitle>
          <DialogDescription>
            Uppdatera detaljerna för din räkning.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title-edit-bill" className="text-right">
              Titel
            </Label>
            <Input
              id="title-edit-bill"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount-edit-bill" className="text-right">
              Belopp (kr)
            </Label>
            <Input
              id="amount-edit-bill"
              type="text" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate-edit-bill" className="text-right">
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
            <Label htmlFor="notes-edit-bill" className="text-right">
              Anteckningar
            </Label>
            <Textarea
              id="notes-edit-bill"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>Spara Ändringar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
