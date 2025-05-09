"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

// This component could trigger a global modal for adding transactions
// For now, it's a placeholder or can be tied to specific page actions.
// import { useTransactionModal } from '@/hooks/useTransactionModal'; 

export function DashboardHeader() {
  const pathname = usePathname();
  // const { onOpen } = useTransactionModal(); // Example for a global modal

  let pageTitle = "Kontrollpanel";
  if (pathname.includes("/overview")) pageTitle = "Ekonomisk Översikt";
  if (pathname.includes("/budget-ai")) pageTitle = "AI Budgetrådgivare";
  if (pathname.includes("/settings")) pageTitle = "Inställningar";


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" /> {/* Hidden on md and up where sidebar is visible or icon-only */}
        <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* 
        // Example: Add transaction button in header. Could open a global modal.
        // For now, adding transactions will be within the BoardView component itself.
        <Button size="sm" variant="outline" onClick={onOpen}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Transaction
        </Button> 
        */}
        <ThemeToggle />
        {/* User Avatar/Menu Placeholder */}
      </div>
    </header>
  );
}
