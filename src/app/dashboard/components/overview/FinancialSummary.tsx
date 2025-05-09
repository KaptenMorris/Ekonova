// src/app/dashboard/components/overview/FinancialSummary.tsx
"use client";

import type { Category, Transaction } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useBoards } from "@/hooks/useBoards";
import { useBills } from "@/hooks/useBills"; // Import useBills
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, DonutChart } from '@tremor/react';
import { Loader2, ReceiptText } from "lucide-react"; // Added ReceiptText
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Helper to convert HSL string to hex for Tremor charts
function hslToHex(hslString: string) {
  if (!hslString) return "#000000";
  const hslMatch = hslString.match(/(\d+)\s*(\d+)%\s*(\d+)%/);
  if (!hslMatch) return "#000000";

  let h = parseInt(hslMatch[1]);
  let s = parseInt(hslMatch[2]) / 100;
  let l = parseInt(hslMatch[3]) / 100;

  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}


export function FinancialSummary() {
  const { activeBoard, isLoadingBoards } = useBoards();
  const { bills, isLoadingBills } = useBills(); // Use bills hook
  const [chartColors, setChartColors] = useState<string[]>([]);
  const [valueFormatter, setValueFormatter] = useState<(value: number) => string>(() => (value: number) => `${value.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })}`);

  const categories = useMemo(() => activeBoard?.categories || [], [activeBoard]);
  const transactions = useMemo(() => activeBoard?.transactions || [], [activeBoard]);

  useEffect(() => {
    if (typeof window !== "undefined") {
        const style = getComputedStyle(document.documentElement);
        const colors = [
            hslToHex(style.getPropertyValue('--chart-1').trim()),
            hslToHex(style.getPropertyValue('--chart-2').trim()),
            hslToHex(style.getPropertyValue('--chart-3').trim()),
            hslToHex(style.getPropertyValue('--chart-4').trim()),
            hslToHex(style.getPropertyValue('--chart-5').trim()),
            hslToHex(style.getPropertyValue('--primary').trim()),
            hslToHex(style.getPropertyValue('--accent').trim()),
        ];
        setChartColors(colors.filter(c => c !== "#000000" && c !== "#")); 

        setValueFormatter(() => (value: number) => 
            `${value.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\s*kr$/, '').trim()} kr`
        );
    }
  }, []);

  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => categories.find(c => c.id === t.categoryId && c.type === 'income'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, categories]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter(t => categories.find(c => c.id === t.categoryId && c.type === 'expense'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, categories]);

  const netBalance = totalIncome - totalExpenses;

  const totalUnpaidBills = useMemo(() => {
    return bills
      .filter(b => !b.isPaid)
      .reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  const incomeExpenseData = [
    { name: "Total Inkomst", value: totalIncome },
    { name: "Totala Utgifter", value: totalExpenses },
  ];

  const expenseBreakdownData = useMemo(() => {
    const expenseMap: { [key: string]: number } = {};
    transactions.forEach(t => {
      const category = categories.find(c => c.id === t.categoryId && c.type === 'expense');
      if (category) {
        expenseMap[category.name] = (expenseMap[category.name] || 0) + t.amount;
      }
    });
    return Object.entries(expenseMap).map(([name, value]) => ({ name, value })).filter(item => item.value > 0);
  }, [transactions, categories]);

  if (isLoadingBoards || isLoadingBills) { // Include isLoadingBills
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeBoard) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Ekonomisk Översikt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Välj eller skapa en tavla för att se översikten.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (transactions.length === 0 && categories.length > 0 && bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ekonomisk Översikt</CardTitle>
        </CardHeader>
        <CardContent>
           <Alert>
            <AlertTitle>Inga Data Ännu</AlertTitle>
            <AlertDescription>
                Den här tavlan har inga transaktioner eller räkningar. Lägg till några för att se din ekonomiska översikt.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
   if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ekonomisk Översikt</CardTitle>
        </CardHeader>
        <CardContent>
           <Alert>
            <AlertTitle>Inga Kategorier</AlertTitle>
            <AlertDescription>
                Den här tavlan har inga kategorier. Lägg till några på kontrollpanelen först.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  const validChartColors = chartColors.length > 0 ? chartColors : ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
  };


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Kontosammanfattning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
            <span className="font-medium text-secondary-foreground">Total Inkomst</span>
            <span className="font-bold text-green-500 text-xl">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
            <span className="font-medium text-secondary-foreground">Totala Utgifter</span>
            <span className="font-bold text-red-500 text-xl">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
            <span className="font-medium text-primary">Nettosaldo</span>
            <span className={`font-bold text-xl ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(netBalance)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ReceiptText className="mr-2 h-6 w-6 text-primary" />
            Obetalda Räkningar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
            <span className="font-medium text-destructive">Totalt Obetalt</span>
            <span className="font-bold text-red-500 text-xl">{formatCurrency(totalUnpaidBills)}</span>
          </div>
          {/* You could add more bill-related info here, e.g., upcoming due dates */}
        </CardContent>
      </Card>


      {(totalIncome > 0 || totalExpenses > 0) && (
      <Card className="md:col-span-2 lg:col-span-2"> {/* Adjusted to col-span-2 to fill remaining space better on LG */}
        <CardHeader>
          <CardTitle>Inkomster vs. Utgifter</CardTitle>
          <CardDescription>Jämförelse av dina inkomster och utgifter för den valda tavlan.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            className="mt-6 h-72"
            data={incomeExpenseData}
            index="name"
            categories={["value"]}
            colors={validChartColors.slice(0,2)}
            yAxisWidth={60}
            valueFormatter={valueFormatter}
            noDataText="Ingen data tillgänglig."
          />
        </CardContent>
      </Card>
      )}
      
      {expenseBreakdownData.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Utgiftsfördelning</CardTitle>
            <CardDescription>Hur dina utgifter fördelas mellan kategorier för den valda tavlan.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <DonutChart
              className="mt-6 h-80 w-full max-w-lg"
              data={expenseBreakdownData}
              category="value"
              index="name"
              colors={validChartColors}
              valueFormatter={valueFormatter}
              noDataText="Ingen data tillgänglig."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
