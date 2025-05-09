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
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShareBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  onShareBoard: (boardId: string, email: string) => void;
  onUnshareBoard: (boardId: string, email: string) => void;
}

export function ShareBoardDialog({ isOpen, onClose, board, onShareBoard, onUnshareBoard }: ShareBoardDialogProps) {
  const [email, setEmail] = useState("");
  const [sharedWithList, setSharedWithList] = useState<string[]>([]);

  useEffect(() => {
    if (board && isOpen) {
      setSharedWithList(board.sharedWith || []);
    } else {
      setSharedWithList([]);
    }
  }, [board, isOpen]);

  const handleAddEmail = () => {
    if (!board || email.trim() === "" || !/\S+@\S+\.\S+/.test(email.trim())) {
      alert("Ange en giltig e-postadress.");
      return;
    }
    onShareBoard(board.id, email.trim());
    setSharedWithList(prev => [...prev, email.trim()]); // Optimistic update
    setEmail("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (!board) return;
    onUnshareBoard(board.id, emailToRemove);
    setSharedWithList(prev => prev.filter(e => e !== emailToRemove)); // Optimistic update
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dela Tavla "{board?.name}"</DialogTitle>
          <DialogDescription>
            Bjuda in andra att se och (i framtiden) samarbeta på denna tavla. (Nuvarande funktionalitet är en demonstration).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              id="shareEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kollega@exempel.com"
              className="flex-grow"
            />
            <Button onClick={handleAddEmail} variant="outline">Lägg till</Button>
          </div>
          {sharedWithList.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Delad med:</Label>
              <ScrollArea className="h-24 mt-1 rounded-md border p-2">
                <div className="space-y-1">
                  {sharedWithList.map((sharedEmail, index) => (
                    <Badge key={index} variant="secondary" className="flex justify-between items-center">
                      <span>{sharedEmail}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-2"
                        onClick={() => handleRemoveEmail(sharedEmail)}
                      >
                        <XIcon size={14} />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="default">
              Stäng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
