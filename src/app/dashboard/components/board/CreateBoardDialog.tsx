"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

interface CreateBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (name: string) => void;
}

export function CreateBoardDialog({ isOpen, onClose, onCreateBoard }: CreateBoardDialogProps) {
  const [boardName, setBoardName] = useState("");

  const handleSubmit = () => {
    if (boardName.trim() === "") {
      alert("Tavlans namn får inte vara tomt.");
      return;
    }
    onCreateBoard(boardName.trim());
    setBoardName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setBoardName(""); // Reset on close
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Skapa Ny Transaktionstavla</DialogTitle>
          <DialogDescription>
            Ge din nya tavla ett namn. Du kan hantera kategorier och transaktioner separat för varje tavla.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="boardName" className="text-right">
              Namn
            </Label>
            <Input
              id="boardName"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="col-span-3"
              placeholder="t.ex. Månadsbudget, Semesterkassa"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Avbryt
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>Skapa Tavla</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
