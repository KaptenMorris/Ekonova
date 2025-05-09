
"use client";

import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Edit2, Share2, Trash2, MoreHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateBoardDialog } from '@/app/dashboard/components/board/CreateBoardDialog';
import { RenameBoardDialog } from '@/app/dashboard/components/board/RenameBoardDialog';
import { ShareBoardDialog } from '@/app/dashboard/components/board/ShareBoardDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";


export function DashboardHeader() {
  const { 
    boards, 
    activeBoard, 
    activeBoardId, 
    setActiveBoardId, 
    addBoard, 
    renameBoard, 
    deleteBoard, 
    shareBoard,
    unshareBoard,
    isLoadingBoards 
  } = useBoards();
  
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isRenameBoardOpen, setIsRenameBoardOpen] = useState(false);
  const [isShareBoardOpen, setIsShareBoardOpen] = useState(false);
  const [boardToEdit, setBoardToEdit] = useState<typeof activeBoard>(activeBoard);


  useEffect(() => {
    // Keep boardToEdit in sync with activeBoard if no dialog is open
    // This ensures that actions from the dropdown menu always target the currently active board
    if (!isRenameBoardOpen && !isShareBoardOpen) {
      setBoardToEdit(activeBoard);
    }
  }, [activeBoard, isRenameBoardOpen, isShareBoardOpen]);

  const handleBoardSelection = (boardId: string) => {
    setActiveBoardId(boardId);
  };

  const handleCreateBoard = (name: string) => {
    addBoard(name);
    setIsCreateBoardOpen(false);
  };

  const handleRenameBoard = (boardId: string, newName: string) => {
    renameBoard(boardId, newName);
    setIsRenameBoardOpen(false);
  };
  
  const handleDeleteBoard = () => {
    // Ensure boardToEdit is up-to-date, especially if activeBoard changed right before delete
    const currentActiveBoardForDelete = activeBoard; 
    if (currentActiveBoardForDelete) {
      deleteBoard(currentActiveBoardForDelete.id);
    }
    // Dialog will close itself or be handled by AlertDialog's onOpenChange
  };

  const openRenameDialog = () => {
    setBoardToEdit(activeBoard); // Set the board to be edited to the current active board
    setIsRenameBoardOpen(true);
  };

  const openShareDialog = () => {
    setBoardToEdit(activeBoard); // Set the board to be shared to the current active board
    setIsShareBoardOpen(true);
  };
  
  // For delete, AlertDialogTrigger handles showing the dialog.
  // boardToEdit is used within handleDeleteBoardConfirm, updated by useEffect or direct set.

  const pageTitle = activeBoard ? activeBoard.name : (isLoadingBoards ? "Laddar tavlor..." : "Välj en tavla");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-1 sm:gap-2">
        <SidebarTrigger className="md:hidden" />
        {isLoadingBoards ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-lg font-semibold text-muted-foreground">{pageTitle}</span>
          </div>
        ) : boards.length > 0 && activeBoardId ? (
          <Select value={activeBoardId} onValueChange={handleBoardSelection}>
            <SelectTrigger className="w-full truncate pr-8 text-lg font-semibold sm:w-auto sm:min-w-[150px] sm:max-w-[300px] border-0 bg-transparent px-1 py-0 shadow-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5">
              <SelectValue placeholder="Välj en tavla..." />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
           <h1 className="text-lg font-semibold text-muted-foreground sm:text-xl">{boards.length === 0 ? "Skapa en tavla" : "Välj en tavla"}</h1>
        )}

        {!isLoadingBoards && activeBoard && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={openRenameDialog} disabled={!activeBoard}>
                <Edit2 className="mr-2 h-4 w-4" /> Byt namn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openShareDialog} disabled={!activeBoard}>
                <Share2 className="mr-2 h-4 w-4" /> Dela
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  {/* Clicks inside DropdownMenuItem with AlertDialogTrigger needs to be handled to not close dropdown immediately */}
                  <div className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50", 
                                  "text-destructive focus:bg-destructive/10 focus:text-destructive")}
                       onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing if it's part of item props
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Radera tavla
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Är du helt säker?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Denna åtgärd kommer permanent att radera tavlan "{activeBoard?.name}" och all dess data (kategorier och transaktioner). Detta kan inte ångras.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteBoard} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                      Ja, radera tavlan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="sm" variant="outline" onClick={() => setIsCreateBoardOpen(true)} disabled={isLoadingBoards} className="flex-shrink-0">
          <PlusCircle className="mr-1 h-4 w-4 sm:mr-2" /> 
          <span className="hidden sm:inline">Ny Tavla</span>
          <span className="sm:hidden">Ny</span>
        </Button>
        <ThemeToggle />
      </div>

      <CreateBoardDialog 
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreateBoard={handleCreateBoard}
      />
      {/* Ensure boardToEdit is passed correctly, and that it's not null when dialogs expect a board */}
      {boardToEdit && ( 
        <>
          <RenameBoardDialog
            isOpen={isRenameBoardOpen}
            onClose={() => setIsRenameBoardOpen(false)}
            board={boardToEdit} 
            onRenameBoard={handleRenameBoard}
          />
          <ShareBoardDialog
            isOpen={isShareBoardOpen}
            onClose={() => setIsShareBoardOpen(false)}
            board={boardToEdit}
            onShareBoard={shareBoard}
            onUnshareBoard={unshareBoard}
          />
        </>
      )}
    </header>
  );
}

