
"use client";

import type React from 'react';
import { ThemeProvider } from 'next-themes';
import { MockAuthProvider as AuthProvider } from '@/hooks/useMockAuth'; // Renamed import alias
import { BoardProvider } from '@/hooks/useBoards';
import { BillProvider } from '@/hooks/useBills';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <BillProvider>
          <BoardProvider>
            {children}
          </BoardProvider>
        </BillProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
