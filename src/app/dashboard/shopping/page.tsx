
"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useBoards } from "@/hooks/useBoards";
import { useToast } from "@/hooks/use-toast";
import type { Category, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ShoppingBag, Package, Loader2, Info, ImageUp } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SHOPPING_CATEGORY_NAME, SHOPPING_CATEGORY_ICON } from "@/config/constants";

export default function ShoppingPage() {
  const { activeBoard, addTransactionToActiveBoard, addCategoryToActiveBoard, isLoadingBoards } = useBoards();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [receiptImageFile, setReceiptImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expenseCategories = useMemo(() => {
    return activeBoard?.categories.filter(cat => cat.type === 'expense') || [];
  }, [activeBoard]);

  // Set default category to "Inköp" if it exists
  useEffect(() => {
    if (activeBoard && expenseCategories.length > 0) {
      const shoppingCat = expenseCategories.find(cat => cat.name === SHOPPING_CATEGORY_NAME);
      if (shoppingCat) {
        setSelectedCategoryId(shoppingCat.id);
      } else if (expenseCategories.length > 0) {
        // setSelectedCategoryId(expenseCategories[0].id); // Or leave empty to force selection
      }
    }
  }, [activeBoard, expenseCategories]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setReceiptImageFile(event.target.files[0]);
    } else {
      setReceiptImageFile(null);
    }
  };

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setDate(new Date());
    // Keep selectedCategoryId or reset if preferred: setSelectedCategoryId(""); 
    setNotes("");
    setReceiptImageFile(null);
    const fileInput = document.getElementById('receiptImage') as HTMLInputElement | null;
    if (fileInput) fileInput.value = ""; // Reset file input
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeBoard) {
      toast({ variant: "destructive", title: "Fel", description: "Ingen aktiv tavla. Välj en tavla först." });
      return;
    }
    if (!title || !amount || !date || !selectedCategoryId) {
      toast({ variant: "destructive", title: "Fält saknas", description: "Fyll i titel, belopp, datum och kategori." });
      return;
    }
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ variant: "destructive", title: "Ogiltigt belopp", description: "Ange ett positivt numeriskt värde för belopp." });
      return;
    }

    setIsSubmitting(true);

    let categoryToUseId = selectedCategoryId;
    let category = activeBoard.categories.find(c => c.id === categoryToUseId);

    // If the selected category is not found (e.g. somehow stale), or if no category was selected and we want to force "Inköp"
    // For now, we rely on the select having valid options.
    // A more robust approach might be to re-check for "Inköp" category or create if needed.
    // But since "Inköp" is now in initial templates, it should generally exist.

    if (!category) {
        // Try to find or create the "Inköp" category if the selected one is invalid or missing
        let shoppingCategory = activeBoard.categories.find(cat => cat.name === SHOPPING_CATEGORY_NAME && cat.type === 'expense');
        if (!shoppingCategory) {
            const newCat = addCategoryToActiveBoard({ name: SHOPPING_CATEGORY_NAME, type: 'expense', icon: SHOPPING_CATEGORY_ICON });
            if (newCat) {
                shoppingCategory = newCat;
            } else {
                toast({ variant: "destructive", title: "Fel", description: "Kunde inte skapa eller hitta Inköpskategori." });
                setIsSubmitting(false);
                return;
            }
        }
        categoryToUseId = shoppingCategory.id;
    }
    
    let transactionDescription = notes;
    if (receiptImageFile) {
      transactionDescription = `${notes}${notes ? ". " : ""}Kvittofil: ${receiptImageFile.name}`.trim();
    }

    const transactionData: Omit<Transaction, 'id'> = {
      title,
      amount: numericAmount,
      date: date.toISOString(),
      categoryId: categoryToUseId,
      description: transactionDescription,
    };

    const addedTransaction = addTransactionToActiveBoard(transactionData);

    if (addedTransaction) {
      toast({ title: "Inköp Registrerat", description: `${title} har lagts till på tavlan ${activeBoard.name}.` });
      resetForm();
    } else {
      toast({ variant: "destructive", title: "Fel", description: "Kunde inte registrera inköpet." });
    }
    setIsSubmitting(false);
  };


  if (isLoadingBoards) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Laddar data...</p>
      </div>
    );
  }

  if (!activeBoard) {
    return (
        <Card className="shadow-xl">
             <CardHeader>
                <CardTitle className="flex items-center text-2xl font-semibold">
                <ShoppingBag className="mr-3 h-7 w-7 text-primary" />
                Registrera Inköp
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="default">
                  <Info className="h-5 w-5" />
                  <AlertTitle>Ingen Aktiv Tavla</AlertTitle>
                  <AlertDescription>Välj eller skapa en tavla för att kunna registrera dina inköp.</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }
  
  if (expenseCategories.length === 0) {
      return (
        <Card className="shadow-xl">
             <CardHeader>
                <CardTitle className="flex items-center text-2xl font-semibold">
                <ShoppingBag className="mr-3 h-7 w-7 text-primary" />
                Registrera Inköp
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="default">
                    <Info className="h-5 w-5"/>
                    <AlertTitle>Skapa en Utgiftskategori Först</AlertTitle>
                    <AlertDescription>Du måste ha minst en utgiftskategori på din aktiva tavla innan du kan registrera inköp. Gå till kontrollpanelen för att lägga till en.</AlertDescription>
                 </Alert>
            </CardContent>
        </Card>
      );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-primary">Registrera Inköp</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ShoppingBag className="mr-3 h-7 w-7" />
            Nytt Inköp
          </CardTitle>
          <CardDescription>Lägg till detaljer om ditt senaste inköp. Detta kommer att skapa en utgiftstransaktion på din aktiva tavla: <span className="font-medium text-primary">{activeBoard.name}</span>.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titel / Beskrivning</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. Matvaror från ICA, Kläder" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Belopp (kr)</Label>
                <Input id="amount" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="t.ex. 349,50" disabled={isSubmitting} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: sv }) : <span>Välj ett datum</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={sv} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={isSubmitting}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Välj en utgiftskategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon && <Package className="mr-2 h-4 w-4 inline-block" />} {/* Placeholder, needs dynamic icon */}
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="receiptImage">Ladda upp Kvitto (Bild)</Label>
                <div className={cn("flex items-center justify-center w-full px-3 py-2 text-sm border border-input rounded-md", receiptImageFile ? "border-primary" : "")}>
                    <label htmlFor="receiptImage" className="flex flex-col items-center justify-center w-full h-24 border-2 border-border border-dashed rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary/80">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageUp className={cn("w-8 h-8 mb-2", receiptImageFile ? "text-primary" : "text-muted-foreground" )} />
                            {receiptImageFile ? (
                                <>
                                    <p className="text-sm text-primary"><span className="font-semibold">{receiptImageFile.name}</span></p>
                                    <p className="text-xs text-muted-foreground">Klicka för att byta fil</p>
                                </>
                            ) : (
                                <>
                                    <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Klicka för att ladda upp</span> eller dra och släpp</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF (MAX. 2MB)</p>
                                </>
                            )}
                        </div>
                        <Input id="receiptImage" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isSubmitting} />
                    </label>
                </div>
                <p className="text-xs text-muted-foreground">Frivilligt. Filen sparas inte permanent i denna demoversion.</p>
            </div>


            <div className="space-y-2">
              <Label htmlFor="notes">Anteckningar / Kvittoinformation</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Skriv in detaljer från kvittot, eller andra anteckningar..."
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingBag className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Registrerar...' : 'Registrera Inköp'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
