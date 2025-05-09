"use client";

import { useState, useEffect } from "react";
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
import type { Board } from "@/types";

interface RenameBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  onRenameBoard: (boardId: string, newName: string) => void;
}

export function RenameBoardDialog({ isOpen, onClose, board, onRenameBoard }: RenameBoardDialogProps) {
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (board && isOpen) {
      setNewName(board.name);
    }
  }, [board, isOpen]);

  const handleSubmit = () => {
    if (!board) return;
    if (newName.trim() === "") {
      alert("Tavlans namn får inte vara tomt.");
      return;
    }
    onRenameBoard(board.id, newName.trim());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Byt Namn på Tavla</DialogTitle>
          <DialogDescription>
            Ändra namnet på din transaktionstavla "{board?.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newName" className="text-right">
              Nytt Namn
            </Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="col-span-3"
              placeholder="Ange nytt namn"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Avbryt
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>Spara Namn</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
