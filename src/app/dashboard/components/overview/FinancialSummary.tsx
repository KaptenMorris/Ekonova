
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
    if (/^#([0-9A-F]{3}){1,2}$/i.test(hslString)) return hslString.toUpperCase();
    console.warn(`Invalid HSL string for HSL to HEX conversion: ${hslString}, returning black.`);
    return "#000000";
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
        
        // Colors for Donut Chart (Expense Breakdown - primarily red-themed)
        const destructiveColorHsl = style.getPropertyValue('--destructive').trim(); // Main red
        const chart4Hsl = style.getPropertyValue('--chart-4').trim();     // Orange-Yellowish
        const chart5Hsl = style.getPropertyValue('--chart-5').trim();     // Orangeish

        // Ensure primary destructive color is first
        const expensePaletteHslRaw = [
            destructiveColorHsl,
            chart5Hsl, // A warmer, less intense red/orange
            chart4Hsl, // An even warmer, perhaps yellowish/orange for variety
            'hsl(0, 70%, 70%)', // Lighter variant of main red
            'hsl(0, 60%, 50%)', // Darker variant of main red
            'hsl(10, 75%, 65%)', // Slightly more orange-red
        ];
        
        const generatedExpenseDonutColors = expensePaletteHslRaw
            .map(hsl => hslToHex(hsl))
            .filter(hex => hex && hex !== "#000000" && hex.length > 1);

        setExpenseDonutChartColors(generatedExpenseDonutColors.length > 0 ? generatedExpenseDonutColors : ['#F04438', '#F79009', '#FDB022', '#FDA29B', '#D92D20', '#B42318']);


        // Specific colors for Bar Chart (Income vs Expense)
        const incomeColor = hslToHex(style.getPropertyValue('--chart-2').trim() || 'hsl(145 63% 42%)'); // Greenish
        const expenseColor = hslToHex(style.getPropertyValue('--destructive').trim() || 'hsl(0 84% 60%)'); // Reddish
        
        setBarChartIncomeExpenseColors([
            incomeColor && incomeColor !== "#000000" ? incomeColor : '#10B981', // Default Green
            expenseColor && expenseColor !== "#000000" ? expenseColor : '#EF4444'  // Default Red
        ]);


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
    { name: "Total Inkomst", Inkomst: totalIncome, Utgifter: 0 }, // Structure for separate color assignment
    { name: "Totala Utgifter", Inkomst: 0, Utgifter: totalExpenses },
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
            categories={["Inkomst", "Utgifter"]} // Ensure these match keys in incomeExpenseData
            colors={barChartIncomeExpenseColors} // [green, red]
            yAxisWidth={60}
            valueFormatter={valueFormatter}
            noDataText="Ingen data tillgänglig."
            showLegend={false} // Legend is implicitly handled by category names if needed, or keep false.
            stack={false} // Ensure bars are side-by-side if that's the intent for distinct income/expense. If stacked, ensure data structure supports it.
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
              colors={expenseDonutChartColors} // Uses the red/warm-themed palette for expenses
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

