
"use client";

import type React from 'react';
import { ThemeProvider } from 'next-themes';
import { MockAuthProvider } from '@/hooks/useMockAuth'; // Ensure .tsx is resolved
import { BoardProvider } from '@/hooks/useBoards';
import { BillProvider } from '@/hooks/useBills';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MockAuthProvider>
        <BillProvider>
          <BoardProvider>
            {children}
          </BoardProvider>
        </BillProvider>
      </MockAuthProvider>
    </ThemeProvider>
  );
}
