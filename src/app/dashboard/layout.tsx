
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useMockAuth'; // Use useAuth
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: isLoadingAuth, currentUserEmail } = useAuth(); // Use useAuth
  const { isLoadingBoards: isLoadingBoardsData } = useBoards(); // Get board loading state separately
  const router = useRouter();

  useEffect(() => {
    // If auth has loaded and user is not authenticated, redirect to login
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  // Combine loading states
  const isLoading = isLoadingAuth || isLoadingBoardsData;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-lg">Laddar data...</span>
      </div>
    );
  }

  // This check ensures that if auth is loaded, but user is not authenticated,
  // we don't render the dashboard layout before redirect happens.
  if (!isAuthenticated) {
    // Even if not loading, if not authenticated, show loading/redirecting state
    // as the useEffect above will trigger the redirect shortly.
     return (
         <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <span className="ml-4 text-lg">Omdirigerar...</span>
        </div>
    );
  }

  // Only render dashboard if authenticated and not loading
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-secondary/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
