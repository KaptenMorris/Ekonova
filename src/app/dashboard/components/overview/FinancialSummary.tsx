
"use client";

import type { Category, Transaction } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useBoards } from "@/hooks/useBoards";
import { useBills } from "@/hooks/useBills"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, DonutChart } from '@tremor/react';
import { Loader2, ReceiptText, Coins, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"; 
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Helper to convert HSL string to hex for Tremor charts
function hslToHex(hslString: string): string {
  if (!hslString || typeof hslString !== 'string') return "#000000"; 

  const hslMatch = hslString.match(/(\d+(\.\d+)?)\s*(\d+(\.\d+)?)%\s*(\d+(\.\d+)?)%/);
  if (!hslMatch) {
    // Check if it's already a hex color
    if (/^#([0-9A-F]{3}){1,2}$/i.test(hslString)) return hslString.toUpperCase();
    // console.warn(`Invalid HSL string for HSL to HEX conversion: ${hslString}, returning black.`);
    return "#000000"; // Return black for invalid non-HSL, non-HEX strings
  }

  let h = parseFloat(hslMatch[1]);
  let s = parseFloat(hslMatch[3]) / 100;
  let l = parseFloat(hslMatch[5]) / 100;

  if (s < 0) s = 0;
  if (s > 1) s = 1;
  if (l < 0) l = 0;
  if (l > 1) l = 1;


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

  const toHex = (val: number) => {
    const hex = val.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}


export function FinancialSummary() {
  const { activeBoard, isLoadingBoards } = useBoards();
  const { bills, isLoadingBills } = useBills(); 
  const [expenseDonutChartColors, setExpenseDonutChartColors] = useState<string[]>([]);
  const [barChartIncomeExpenseColors, setBarChartIncomeExpenseColors] = useState<[string, string]>(['#10B981', '#EF4444']); 
  const [valueFormatter, setValueFormatter] = useState<(value: number) => string>(() => (value: number) => `${value.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })}`);

  const categories = useMemo(() => activeBoard?.categories || [], [activeBoard]);
  const transactions = useMemo(() => activeBoard?.transactions || [], [activeBoard]);

  useEffect(() => {
    if (typeof window !== "undefined") {
        const style = getComputedStyle(document.documentElement);
        
        // For Bar Chart (Income vs Expense)
        // --chart-2 should be green (for income), --destructive should be red (for expenses)
        const incomeColorHex = hslToHex(style.getPropertyValue('--chart-2').trim() || 'hsl(145 63% 42%)'); 
        const expenseColorHex = hslToHex(style.getPropertyValue('--destructive').trim() || 'hsl(0 84% 60%)');
        
        setBarChartIncomeExpenseColors([
            (incomeColorHex && incomeColorHex !== '#000000') ? incomeColorHex : '#10B981', // Default Green if theme fails
            (expenseColorHex && expenseColorHex !== '#000000') ? expenseColorHex : '#EF4444'  // Default Red if theme fails
        ]);

        // For Donut Chart (Expense Breakdown - primarily red-themed from --destructive, with accents)
        const destructiveColorFromTheme = hslToHex(style.getPropertyValue('--destructive').trim());
        const chart4ColorFromTheme = hslToHex(style.getPropertyValue('--chart-4').trim());
        const chart5ColorFromTheme = hslToHex(style.getPropertyValue('--chart-5').trim());

        const primaryDestructiveHex = (destructiveColorFromTheme && destructiveColorFromTheme !== '#000000') ? destructiveColorFromTheme : '#EF4444'; // Default Red

        const expensePalette = [
            primaryDestructiveHex,
            (chart5ColorFromTheme && chart5ColorFromTheme !== '#000000') ? chart5ColorFromTheme : '#F97316', // Default Orange (Tailwind orange-500)
            (chart4ColorFromTheme && chart4ColorFromTheme !== '#000000') ? chart4ColorFromTheme : '#F59E0B', // Default Amber (Tailwind amber-500)
            hslToHex('hsl(0, 70%, 70%)'), // Lighter Red variant
            hslToHex('hsl(0, 65%, 55%)'), // Mid Red variant
            hslToHex('hsl(10, 80%, 60%)'), // Orange-Red variant
        ].filter(color => color && color !== '#000000' && color.length > 1); // Filter out invalid conversions (black) and ensure it's a valid hex (e.g. not just "#")


        // Fallback if all theme colors fail or result in black for the donut chart
        const finalDonutColors = expensePalette.length > 0 ? expensePalette : ['#EF4444', '#F97316', '#F59E0B', '#F87171', '#DC2626', '#EA580C'];
        setExpenseDonutChartColors(finalDonutColors);

        setValueFormatter(() => (value: number) => 
            `${value.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\s*kr$/, '').trim()} kr`
        );
    }
  }, []); // Runs once on mount to get CSS variables

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
    // Data must have keys matching the `categories` prop of BarChart
    { name: "Total Inkomst", "Inkomst": totalIncome, "Utgifter": 0 }, // Using "Inkomst" and "Utgifter" as keys
    { name: "Totala Utgifter", "Inkomst": 0, "Utgifter": totalExpenses },
  ];
  
  const expenseBreakdownData = useMemo(() => {
    const expenseMap: { [key: string]: number } = {};
    transactions.forEach(t => {
      const category = categories.find(c => c.id === t.categoryId && c.type === 'expense');
      if (category) {
        expenseMap[category.name] = (expenseMap[category.name] || 0) + t.amount;
      }
    });
    return Object.entries(expenseMap).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a,b) => b.value - a.value);
  }, [transactions, categories]);

  if (isLoadingBoards || isLoadingBills) { 
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
           <Alert variant="default">
            <Coins className="h-5 w-5" />
            <AlertTitle>Ingen Tavla Vald</AlertTitle>
            <AlertDescription>Välj eller skapa en tavla från menyn ovan för att se din ekonomiska översikt.</AlertDescription>
          </Alert>
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
            <AlertCircle className="h-5 w-5" />
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
           <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Inga Kategorier</AlertTitle>
            <AlertDescription>
                Den här tavlan har inga kategorier. Lägg till några på kontrollpanelen först.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
  };


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Kontosammanfattning</CardTitle>
          <CardDescription>Din nuvarande ekonomiska ställning för tavlan: <span className="font-semibold">{activeBoard.name}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
            <div className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
                <span className="font-medium text-secondary-foreground">Total Inkomst</span>
            </div>
            <span className="font-bold text-green-600 text-lg">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
             <div className="flex items-center">
                <TrendingDown className="mr-2 h-5 w-5 text-red-600" />
                <span className="font-medium text-secondary-foreground">Totala Utgifter</span>
            </div>
            <span className="font-bold text-red-600 text-lg">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center">
                <Coins className="mr-2 h-5 w-5 text-primary" />
                <span className="font-medium text-primary">Nettosaldo</span>
            </div>
            <span className={`font-bold text-lg ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netBalance)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <ReceiptText className="mr-3 h-7 w-7" />
            Obetalda Räkningar
          </CardTitle>
          <CardDescription>Summan av alla dina obetalda räkningar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-destructive/10 rounded-lg">
             <div className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">Totalt Obetalt</span>
            </div>
            <span className="font-bold text-red-600 text-lg">{formatCurrency(totalUnpaidBills)}</span>
          </div>
          {bills.filter(b => !b.isPaid).length > 0 && (
             <p className="text-xs text-muted-foreground text-center">
                Du har {bills.filter(b => !b.isPaid).length} obetald(a) räkning(ar).
            </p>
          )}
           {bills.filter(b => !b.isPaid).length === 0 && (
             <p className="text-sm text-green-600 text-center py-2">
                Alla räkningar är betalda!
            </p>
          )}
        </CardContent>
      </Card>


      {(totalIncome > 0 || totalExpenses > 0) && (
      <Card className="md:col-span-2 lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow"> 
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Inkomster vs. Utgifter</CardTitle>
          <CardDescription>Jämförelse av dina totala inkomster och utgifter.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            className="mt-6 h-72"
            data={incomeExpenseData}
            index="name"
            categories={["Inkomst", "Utgifter"]} // These keys must match data structure & color mapping
            colors={barChartIncomeExpenseColors} // Should be [greenForIncome, redForExpense]
            yAxisWidth={60}
            valueFormatter={valueFormatter}
            noDataText="Ingen data tillgänglig."
            showLegend={false} 
            stack={false} 
          />
        </CardContent>
      </Card>
      )}
      
      {expenseBreakdownData.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Utgiftsfördelning</CardTitle>
            <CardDescription>Hur dina utgifter fördelas mellan kategorier.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-4"> 
            <DonutChart
              className="h-80 w-full max-w-2xl" 
              data={expenseBreakdownData}
              category="value"
              index="name"
              colors={expenseDonutChartColors} // Red/Warm palette for expenses
              valueFormatter={valueFormatter}
              noDataText="Inga utgiftsdata tillgängliga."
              variant="pie" 
              label={valueFormatter(expenseBreakdownData.reduce((sum, item) => sum + item.value,0))} 
            />
          </CardContent>
        </Card>
      )}
       {(expenseBreakdownData.length === 0 && (totalIncome > 0 || totalExpenses > 0)) && (
           <Card className="md:col-span-2 lg:col-span-3 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                    <CardTitle className="text-2xl text-primary">Utgiftsfördelning</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle>Inga Utgiftsdata</AlertTitle>
                        <AlertDescription>Det finns inga utgiftstransaktioner att visa i fördelningen ännu för tavlan "{activeBoard?.name}".</AlertDescription>
                    </Alert>
                </CardContent>
           </Card>
       )}
    </div>
  );
}

