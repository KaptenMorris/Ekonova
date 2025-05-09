"use client";

import { useState } from 'react';
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
  const [boardToEdit, setBoardToEdit] = useState(activeBoard); // For rename/share/delete

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
    if (boardToEdit) {
      deleteBoard(boardToEdit.id);
    }
  };

  const openRenameDialog = () => {
    setBoardToEdit(activeBoard);
    setIsRenameBoardOpen(true);
  };

  const openShareDialog = () => {
    setBoardToEdit(activeBoard);
    setIsShareBoardOpen(true);
  };
  
  const openDeleteDialog = () => {
    setBoardToEdit(activeBoard);
    // AlertDialog is triggered directly, no separate state needed if using AlertDialogTrigger
  };


  const pageTitle = activeBoard ? activeBoard.name : (isLoadingBoards ? "Laddar tavlor..." : "Välj en tavla");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        {isLoadingBoards ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-lg font-semibold text-muted-foreground">{pageTitle}</span>
          </div>
        ) : boards.length > 0 && activeBoardId ? (
          <Select value={activeBoardId} onValueChange={handleBoardSelection}>
            <SelectTrigger className="w-auto min-w-[150px] max-w-[250px] border-0 bg-transparent px-1 py-0 text-xl font-semibold shadow-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5">
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
           <h1 className="text-xl font-semibold text-muted-foreground">Inga tavlor</h1>
        )}

        {!isLoadingBoards && activeBoard && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={openRenameDialog}>
                <Edit2 className="mr-2 h-4 w-4" /> Byt namn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openShareDialog}>
                <Share2 className="mr-2 h-4 w-4" /> Dela
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Radera tavla
                  </DropdownMenuItem>
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
                    <AlertDialogAction onClick={handleDeleteBoard} className="bg-destructive hover:bg-destructive/90">
                      Ja, radera tavlan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setIsCreateBoardOpen(true)} disabled={isLoadingBoards}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ny Tavla
        </Button>
        <ThemeToggle />
      </div>

      <CreateBoardDialog 
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreateBoard={handleCreateBoard}
      />
      {activeBoard && (
        <>
          <RenameBoardDialog
            isOpen={isRenameBoardOpen}
            onClose={() => setIsRenameBoardOpen(false)}
            board={activeBoard} 
            onRenameBoard={handleRenameBoard}
          />
          <ShareBoardDialog
            isOpen={isShareBoardOpen}
            onClose={() => setIsShareBoardOpen(false)}
            board={activeBoard}
            onShareBoard={shareBoard}
            onUnshareBoard={unshareBoard}
          />
        </>
      )}
    </header>
  );
}
