
"use client";

import { useState, useMemo } from "react";
import { useBills } from "@/hooks/useBills";
import { useBoards } from "@/hooks/useBoards"; // Import useBoards
import { useToast } from "@/hooks/use-toast"; // Import useToast
import type { Bill } from "@/types";
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
  const { bills, isLoadingBills, addBill, toggleBillPaidStatus: toggleBillStatusInHook, deleteBill, updateBill } = useBills();
  const { activeBoard, addCategoryToActiveBoard, addTransactionToActiveBoard, isLoadingBoards } = useBoards();
  const { toast } = useToast();
  const [isAddBillDialogOpen, setIsAddBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);


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

  const handleAddBill = (billData: Omit<Bill, 'id' | 'isPaid' | 'paidDate'>) => {
    const newBill = addBill(billData);
    if (newBill) {
      toast({ title: "Räkning Tillagd", description: `${newBill.title} har lagts till.`});
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
    if (billToDelete) {
      const billInfo = bills.find(b => b.id === billToDelete);
      deleteBill(billToDelete);
      toast({ title: "Räkning Raderad", description: `${billInfo?.title || 'Räkningen'} har raderats.`});
      setBillToDelete(null);
    }
  };

  const handleToggleBillPaidStatus = (billId: string) => {
    const billToToggle = bills.find(b => b.id === billId);
    if (!billToToggle) return;

    const originalIsPaid = billToToggle.isPaid;
    const updatedBill = toggleBillStatusInHook(billId); // From useBills hook

    if (updatedBill && !originalIsPaid && updatedBill.isPaid) {
        // Bill was just marked as paid
        if (!activeBoard) {
            toast({ title: "Fel", description: "Ingen aktiv tavla vald för att bokföra räkningen.", variant: "destructive" });
            return;
        }
        if (!updatedBill.paidDate) {
            toast({ title: "Fel", description: "Betaldatum saknas för räkningen.", variant: "destructive" });
            return; 
        }

        const billsCategoryName = "Betalda Räkningar";
        const billsCategoryIcon = "Receipt";

        let category = activeBoard.categories.find(c => c.name === billsCategoryName && c.type === 'expense');

        if (!category) {
            const newCategory = addCategoryToActiveBoard({
                name: billsCategoryName,
                type: 'expense',
                icon: billsCategoryIcon,
            });
            if (!newCategory) {
                 toast({ title: "Fel", description: `Kunde inte skapa kategorin "${billsCategoryName}". Räkningen markerades som betald, men ingen transaktion skapades.`, variant: "destructive" });
                return;
            }
            category = newCategory;
        }

        addTransactionToActiveBoard({
            title: updatedBill.title,
            amount: updatedBill.amount, 
            date: updatedBill.paidDate,
            categoryId: category.id,
            description: `Automatisk transaktion från betald räkning (ID: ${updatedBill.id})`,
        });
        toast({ title: "Räkning Betald", description: `${updatedBill.title} har markerats som betald och en transaktion har skapats på tavlan '${activeBoard.name}'.` });
    
    } else if (updatedBill && originalIsPaid && !updatedBill.isPaid) {
        // Bill was marked as unpaid
        toast({ title: "Räkning Omarkerad", description: `${updatedBill.title} har markerats som obetald.` });
        // Note: No automatic deletion of transaction here. User can manage that on the board.
    } else if (!updatedBill) {
        toast({ title: "Fel", description: "Kunde inte uppdatera räkningens status.", variant: "destructive"});
    }
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
        <Button onClick={() => setIsAddBillDialogOpen(true)}>
          <PlusCircle className="mr-2 h-5 w-5" /> Lägg till Räkning
        </Button>
      </div>

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
            <ScrollArea className="h-[calc(100vh-450px)] md:h-[calc(100vh-400px)] pr-3">
                <div className="space-y-4">
                {unpaidBills.map(bill => (
                    <BillItemCard 
                        key={bill.id} 
                        bill={bill} 
                        onTogglePaid={handleToggleBillPaidStatus} 
                        onDelete={() => setBillToDelete(bill.id)}
                        onEdit={handleEditBill}
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
            <ScrollArea className="h-[calc(100vh-450px)] md:h-[calc(100vh-400px)] pr-3">
                <div className="space-y-4">
                {paidBills.map(bill => (
                    <BillItemCard 
                        key={bill.id} 
                        bill={bill} 
                        onTogglePaid={handleToggleBillPaidStatus} 
                        onDelete={() => setBillToDelete(bill.id)}
                        onEdit={handleEditBill} 
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
      />
      {editingBill && (
        <EditBillDialog
          isOpen={!!editingBill}
          onClose={() => setEditingBill(null)}
          bill={editingBill}
          onUpdateBill={handleUpdateBill}
        />
      )}
      {billToDelete && (
        <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && setBillToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                <AlertDialogDescription>
                    Denna åtgärd kommer att radera räkningen permanent. Detta kan inte ångras.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBillToDelete(null)}>Avbryt</AlertDialogCancel>
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
