"use client";

import type React from 'react';
import { ThemeProvider } from 'next-themes';
import { MockAuthProvider } from '@/hooks/useMockAuth.tsx'; // Ensure .tsx is resolved

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MockAuthProvider>{children}</MockAuthProvider>
    </ThemeProvider>
  );
}
