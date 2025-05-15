
"use client";

import type { Bill, Category } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface AddBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBill: (bill: Omit<Bill, 'id' | 'userId'>) => void; // Updated prop type
  categories: Category[];
}

export function AddBillDialog({
  isOpen,
  onClose,
  onAddBill,
  categories,
}: AddBillDialogProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [markAsPaidImmediately, setMarkAsPaidImmediately] = useState(false);
  const [paidDateForImmediate, setPaidDateForImmediate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setDueDate(new Date());
    setNotes("");
    setCategoryId("");
    setMarkAsPaidImmediately(false);
    setPaidDateForImmediate(new Date());
  };

  const handleSubmit = () => {
    if (!title || !amount || !dueDate || !categoryId) {
      toast({
        variant: "destructive",
        title: "Obligatoriska fält saknas",
        description: "Vänligen fyll i titel, belopp, förfallodatum och kategori.",
      });
      return;
    }
    if (markAsPaidImmediately && !paidDateForImmediate) {
      toast({
        variant: "destructive",
        title: "Betaldatum saknas",
        description: "Vänligen ange ett betaldatum om räkningen markeras som betald direkt.",
      });
      return;
    }
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
       toast({
        variant: "destructive",
        title: "Ogiltigt Belopp",
        description: "Ange ett positivt nummer för belopp.",
      });
      return;
    }

    const billPayload: Omit<Bill, 'id' | 'userId'> = {
      title,
      amount: numericAmount,
      dueDate: dueDate.toISOString(),
      notes,
      categoryId,
      isPaid: markAsPaidImmediately,
      paidDate: markAsPaidImmediately && paidDateForImmediate ? paidDateForImmediate.toISOString() : null,
    };

    onAddBill(billPayload);
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
            <Label htmlFor="category-add-bill" className="text-right">
              Kategori
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="col-span-3" id="category-add-bill">
                <SelectValue placeholder="Välj en utgiftskategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center">
                      {cat.name}
                    </div>
                  </SelectItem>
                )) : <SelectItem value="no-cat" disabled>Inga utgiftskategorier tillgängliga</SelectItem>}
              </SelectContent>
            </Select>
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
          <div className="col-span-4 flex items-center space-x-2">
            <Checkbox
              id="markAsPaidImmediately"
              checked={markAsPaidImmediately}
              onCheckedChange={(checked) => setMarkAsPaidImmediately(Boolean(checked))}
            />
            <Label htmlFor="markAsPaidImmediately" className="font-normal">Markera som betald direkt?</Label>
          </div>
          {markAsPaidImmediately && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paidDate-add-bill" className="text-right">
                Betaldatum
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !paidDateForImmediate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paidDateForImmediate ? format(paidDateForImmediate, "PPP", { locale: sv }) : <span>Välj betaldatum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={paidDateForImmediate}
                    onSelect={setPaidDateForImmediate}
                    initialFocus
                    locale={sv}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
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
