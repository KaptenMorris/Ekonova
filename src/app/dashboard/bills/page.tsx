
"use client";

import { useState, useMemo } from "react";
import { useBills } from "@/hooks/useBills";
import type { Bill } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Info, CheckCircle2 } from "lucide-react";
import { BillItemCard } from "../components/bills/BillItemCard";
import { AddBillDialog } from "../components/bills/AddBillDialog";
import { EditBillDialog } from "../components/bills/EditBillDialog"; // Import EditBillDialog
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function BillsPage() {
  const { bills, isLoadingBills, addBill, toggleBillPaidStatus, deleteBill, updateBill } = useBills();
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
    addBill(billData);
    setIsAddBillDialogOpen(false);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
  };

  const handleUpdateBill = (updatedBillData: Bill) => {
    updateBill(updatedBillData);
    setEditingBill(null);
  };
  
  const handleDeleteBillConfirm = () => {
    if (billToDelete) {
      deleteBill(billToDelete);
      setBillToDelete(null);
    }
  };


  if (isLoadingBills) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /> Laddar räkningar...
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
                        onTogglePaid={toggleBillPaidStatus} 
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
                        onTogglePaid={toggleBillPaidStatus} 
                        onDelete={() => setBillToDelete(bill.id)}
                        onEdit={handleEditBill} // Paid bills are generally not editable, but keeping for consistency or future needs
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
                <AlertDialogAction onClick={handleDeleteBillConfirm} className="bg-destructive hover:bg-destructive/90">
                    Radera
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
