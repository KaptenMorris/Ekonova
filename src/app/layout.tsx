import type { Metadata } from 'next';
import { Geist } from 'next/font/google'; // Using Geist Sans directly
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'], // Adjusted weights
});

export const metadata: Metadata = {
  title: 'Ekonova',
  description: 'Modern app för personlig ekonomihantering.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
