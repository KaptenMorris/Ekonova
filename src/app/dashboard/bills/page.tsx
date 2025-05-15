
"use client";

import { useState, useMemo } from "react";
import type { Bill, Category } from "@/types";
import { useBills } from "@/hooks/useBills";
import { useBoards } from "@/hooks/useBoards"; 
import { useToast } from "@/hooks/use-toast"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Info, CheckCircle2, Receipt } from "lucide-react";
import { BillItemCard } from "../components/bills/BillItemCard";
import { AddBillDialog } from "../components/bills/AddBillDialog";
import { EditBillDialog } from "../components/bills/EditBillDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function BillsPage() {
  const { bills, isLoadingBills, addBill, toggleBillPaidStatus: toggleBillStatusInHook, deleteBill: deleteBillFromHook, updateBill } = useBills();
  const { activeBoard, addCategoryToActiveBoard, addTransactionToActiveBoard, deleteTransactionFromActiveBoard, isLoadingBoards } = useBoards();
  const { toast } = useToast();
  const [isAddBillDialogOpen, setIsAddBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [billToDeleteId, setBillToDeleteId] = useState<string | null>(null);

  const expenseCategories = useMemo(() => {
    return (activeBoard?.categories || []).filter(c => c.type === 'expense');
  }, [activeBoard]);

  const unpaidBills = useMemo(() => {
    return bills.filter(b => !b.isPaid).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [bills]);

  const paidBills = useMemo(() => {
    return bills.filter(b => b.isPaid).sort((a, b) => {
        const dateA = a.paidDate ? new Date(a.paidDate).getTime() : 0;
        const dateB = b.paidDate ? new Date(b.paidDate).getTime() : 0;
        return dateB - dateA; // Sort by most recently paid
    });
  }, [bills]);

  const handleAddBill = async (billSubmission: Omit<Bill, 'id' | 'userId'>) => {
    const newBill = await addBill(billSubmission); // The hook now handles isPaid and paidDate

    if (newBill) {
      toast({ title: "Räkning Tillagd", description: `${newBill.title} har lagts till.`});

      // If the bill was added as already paid, trigger transaction creation
      if (newBill.isPaid && newBill.paidDate) {
        if (!activeBoard) {
          toast({ title: "Fel", description: "Ingen aktiv tavla vald för att bokföra den betalda räkningen.", variant: "destructive" });
          return;
        }
        if (!newBill.categoryId) {
           toast({ title: "Fel", description: "Kategori saknas för räkningen. Redigera räkningen och välj en kategori.", variant: "destructive" });
           return;
        }

        const targetCategory = activeBoard.categories.find(c => c.id === newBill.categoryId && c.type === 'expense');
        if (!targetCategory) {
            toast({ title: "Fel", description: `Kategorin för räkningen "${newBill.categoryId}" hittades inte på tavlan "${activeBoard.name}". Skapa transaktionen manuellt.`, variant: "destructive" });
            return;
        }

        const transactionAdded = addTransactionToActiveBoard({
            title: newBill.title,
            amount: newBill.amount,
            date: newBill.paidDate, // Use the paidDate from the bill
            categoryId: targetCategory.id,
            description: `Automatisk transaktion från nyligen tillagd betald räkning: ${newBill.title} (ID: ${newBill.id})`,
        });

        if (transactionAdded) {
            toast({ title: "Räkning Betald & Bokförd", description: `${newBill.title} har markerats som betald och en transaktion har skapats i kategorin "${targetCategory.name}" på tavlan '${activeBoard.name}'.` });
        } else {
             toast({ title: "Räkning Betald (Delvis)", description: `${newBill.title} markerades som betald, men kunde inte skapa transaktion automatiskt.`, variant: "destructive" });
        }
      }
    } else {
      toast({ title: "Fel", description: "Kunde inte lägga till räkningen.", variant: "destructive"});
    }
    setIsAddBillDialogOpen(false);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
  };

  const handleUpdateBill = (updatedBillData: Bill) => {
    const updatedBill = updateBill(updatedBillData);
    if (updatedBill) {
      toast({ title: "Räkning Uppdaterad", description: `${updatedBill.title} har uppdaterats.`});
    }
    setEditingBill(null);
  };
  
  const handleDeleteBillConfirm = () => {
    if (billToDeleteId) {
      const billInfo = bills.find(b => b.id === billToDeleteId);
      if (!billInfo) {
        toast({ title: "Fel", description: "Kunde inte hitta räkningen för att radera.", variant: "destructive"});
        setBillToDeleteId(null);
        return;
      }

      let transactionDeletedInfo = "";

      if (billInfo.isPaid && activeBoard && billInfo.id) {
        const transactionToDelete = activeBoard.transactions.find(
            t => t.description?.includes(`(ID: ${billInfo.id})`) && 
                 t.title === billInfo.title && 
                 t.amount === billInfo.amount && 
                 t.categoryId === billInfo.categoryId
        );
        if (transactionToDelete) {
            deleteTransactionFromActiveBoard(transactionToDelete.id);
            transactionDeletedInfo = ` Den tillhörande transaktionen på tavlan '${activeBoard.name}' har också raderats.`;
        }
      }
      
      deleteBillFromHook(billToDeleteId);
      toast({ title: "Räkning Raderad", description: `${billInfo.title} har raderats.${transactionDeletedInfo}`});
      setBillToDeleteId(null);
    }
  };

  const handleToggleBillPaidStatus = (billId: string) => {
    const billToToggle = bills.find(b => b.id === billId);
    if (!billToToggle) return;

    const originalIsPaid = billToToggle.isPaid;
    // toggleBillStatusInHook now returns a Promise
    toggleBillStatusInHook(billId).then(updatedBill => {
        if (updatedBill && !originalIsPaid && updatedBill.isPaid) {
            // Bill was just marked as paid
            if (!activeBoard) {
                toast({ title: "Fel", description: "Ingen aktiv tavla vald för att bokföra räkningen.", variant: "destructive" });
                toggleBillStatusInHook(billId); 
                return;
            }
            if (!updatedBill.paidDate) {
                toast({ title: "Fel", description: "Betaldatum saknas för räkningen.", variant: "destructive" });
                toggleBillStatusInHook(billId); 
                return; 
            }
            if (!updatedBill.categoryId) {
                toast({ title: "Fel", description: "Kategori saknas för räkningen. Redigera räkningen och välj en kategori.", variant: "destructive" });
                toggleBillStatusInHook(billId); 
                return;
            }

            const targetCategory = activeBoard.categories.find(c => c.id === updatedBill.categoryId && c.type === 'expense');

            if (!targetCategory) {
                toast({ title: "Fel", description: `Kategorin för räkningen hittades inte på tavlan. Skapa transaktionen manuellt.`, variant: "destructive" });
                return;
            }

            const transactionAdded = addTransactionToActiveBoard({
                title: updatedBill.title,
                amount: updatedBill.amount, 
                date: updatedBill.paidDate,
                categoryId: targetCategory.id,
                description: `Automatisk transaktion från betald räkning: ${updatedBill.title} (ID: ${updatedBill.id})`,
            });

            if (transactionAdded) {
                toast({ title: "Räkning Betald", description: `${updatedBill.title} har markerats som betald och en transaktion har skapats i kategorin "${targetCategory.name}" på tavlan '${activeBoard.name}'.` });
            } else {
                toast({ title: "Räkning Betald (Delvis)", description: `${updatedBill.title} markerades som betald, men kunde inte skapa transaktion automatiskt.`, variant: "destructive" });
            }
        
        } else if (updatedBill && originalIsPaid && !updatedBill.isPaid) {
            // Bill was marked as unpaid
            if (activeBoard && updatedBill.id) {
                const transactionToDelete = activeBoard.transactions.find(
                    t => t.description?.includes(`(ID: ${updatedBill.id})`) && 
                        t.title === updatedBill.title && 
                        t.amount === updatedBill.amount && 
                        t.categoryId === updatedBill.categoryId
                );
                if (transactionToDelete) {
                    deleteTransactionFromActiveBoard(transactionToDelete.id);
                    toast({
                        title: "Räkning Omarkerad & Transaktion Raderad",
                        description: `${updatedBill.title} har markerats som obetald och den tillhörande transaktionen har tagits bort från tavlan '${activeBoard.name}'.`
                    });
                } else {
                    toast({ title: "Räkning Omarkerad", description: `${updatedBill.title} har markerats som obetald. Ingen matchande transaktion hittades för automatisk radering.` });
                }
            } else {
                toast({ title: "Räkning Omarkerad", description: `${updatedBill.title} har markerats som obetald.` });
            }
        } else if (!updatedBill) {
            toast({ title: "Fel", description: "Kunde inte uppdatera räkningens status.", variant: "destructive"});
        }
    });
  };


  if (isLoadingBills || isLoadingBoards) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /> Laddar data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-primary">Mina Räkningar</h1>
        <Button onClick={() => setIsAddBillDialogOpen(true)} disabled={expenseCategories.length === 0}>
          <PlusCircle className="mr-2 h-5 w-5" /> Lägg till Räkning
        </Button>
      </div>
       {expenseCategories.length === 0 && !isLoadingBoards && (
         <Alert variant="default">
            <Info className="h-5 w-5"/>
            <AlertTitle>Skapa en Utgiftskategori Först</AlertTitle>
            <AlertDescription>Du måste ha minst en utgiftskategori på din aktiva tavla innan du kan lägga till räkningar. Gå till kontrollpanelen för att lägga till en.</AlertDescription>
         </Alert>
       )}


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Info className="mr-3 h-6 w-6 text-destructive" />
            Obetalda Räkningar ({unpaidBills.length})
          </CardTitle>
          <CardDescription>Räkningar som väntar på att bli betalda. Förfallna räkningar markeras.</CardDescription>
        </CardHeader>
        <CardContent>
          {unpaidBills.length === 0 ? (
            <Alert>
                <Receipt className="h-5 w-5" /> 
                <AlertTitle>Inga obetalda räkningar!</AlertTitle>
                <AlertDescription>Du har inga obetalda räkningar just nu. Bra jobbat!</AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[calc(100vh-500px)] md:h-[calc(100vh-450px)] pr-3">
                <div className="space-y-4">
                {unpaidBills.map(bill => (
                    <BillItemCard 
                        key={bill.id} 
                        bill={bill} 
                        onTogglePaid={handleToggleBillPaidStatus} 
                        onDelete={() => setBillToDeleteId(bill.id)}
                        onEdit={handleEditBill}
                        categories={expenseCategories}
                    />
                ))}
                </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <CheckCircle2 className="mr-3 h-6 w-6 text-green-500" />
            Betalda Räkningar ({paidBills.length})
          </CardTitle>
          <CardDescription>En historik över dina tidigare betalda räkningar.</CardDescription>
        </CardHeader>
        <CardContent>
          {paidBills.length === 0 ? (
             <Alert>
                <Receipt className="h-5 w-5" />
                <AlertTitle>Inga betalda räkningar än.</AlertTitle>
                <AlertDescription>När du markerar en räkning som betald kommer den att visas här.</AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[calc(100vh-500px)] md:h-[calc(100vh-450px)] pr-3">
                <div className="space-y-4">
                {paidBills.map(bill => (
                    <BillItemCard 
                        key={bill.id} 
                        bill={bill} 
                        onTogglePaid={handleToggleBillPaidStatus} 
                        onDelete={() => setBillToDeleteId(bill.id)}
                        onEdit={handleEditBill} 
                        categories={expenseCategories}
                    />
                ))}
                </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      <AddBillDialog 
        isOpen={isAddBillDialogOpen} 
        onClose={() => setIsAddBillDialogOpen(false)} 
        onAddBill={handleAddBill} 
        categories={expenseCategories}
      />
      {editingBill && (
        <EditBillDialog
          isOpen={!!editingBill}
          onClose={() => setEditingBill(null)}
          bill={editingBill}
          onUpdateBill={handleUpdateBill}
          categories={expenseCategories}
        />
      )}
      {billToDeleteId && (
        <AlertDialog open={!!billToDeleteId} onOpenChange={(open) => !open && setBillToDeleteId(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                <AlertDialogDescription>
                    Denna åtgärd kommer att radera räkningen permanent. Om räkningen var betald och en transaktion skapades, kommer även den transaktionen att raderas. Detta kan inte ångras.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBillToDeleteId(null)}>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBillConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Radera
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
