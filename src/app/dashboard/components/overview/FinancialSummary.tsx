"use client";

import type { Category, Transaction } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, PieChart, DonutChart } from '@tremor/react'; // Using Tremor for charts as Shadcn chart setup is more involved for quick scaffolding and Tremor is good for dashboards.
// If Tremor is not allowed/installed, this needs to be replaced with Recharts as used in components/ui/chart.tsx

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartColors, setChartColors] = useState<string[]>([]);

  useEffect(() => {
    const storedCategories = localStorage.getItem('ekonova-categories');
    if (storedCategories) setCategories(JSON.parse(storedCategories));
    
    const storedTransactions = localStorage.getItem('ekonova-transactions');
    if (storedTransactions) setTransactions(JSON.parse(storedTransactions));

    // Dynamically get chart colors from CSS variables
    if (typeof window !== "undefined") {
        const style = getComputedStyle(document.documentElement);
        const colors = [
            hslToHex(style.getPropertyValue('--chart-1').trim()),
            hslToHex(style.getPropertyValue('--chart-2').trim()),
            hslToHex(style.getPropertyValue('--chart-3').trim()),
            hslToHex(style.getPropertyValue('--chart-4').trim()),
            hslToHex(style.getPropertyValue('--chart-5').trim()),
            // Add more if needed, or cycle through them
            hslToHex(style.getPropertyValue('--primary').trim()),
            hslToHex(style.getPropertyValue('--accent').trim()),
        ];
        setChartColors(colors.filter(c => c !== "#000000")); // Filter out invalid conversions
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

  const incomeExpenseData = [
    { name: "Total Income", value: totalIncome },
    { name: "Total Expenses", value: totalExpenses },
  ];

  const expenseBreakdownData = useMemo(() => {
    const expenseMap: { [key: string]: number } = {};
    transactions.forEach(t => {
      const category = categories.find(c => c.id === t.categoryId && c.type === 'expense');
      if (category) {
        expenseMap[category.name] = (expenseMap[category.name] || 0) + t.amount;
      }
    });
    return Object.entries(expenseMap).map(([name, value]) => ({ name, value }));
  }, [transactions, categories]);

  if (!transactions.length && !categories.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No transaction data available yet to display charts. Add some transactions first!</p>
        </CardContent>
      </Card>
    );
  }
  
  const validChartColors = chartColors.length > 0 ? chartColors : ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
            <span className="font-medium text-secondary-foreground">Total Income</span>
            <span className="font-bold text-green-500 text-xl">${totalIncome.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
            <span className="font-medium text-secondary-foreground">Total Expenses</span>
            <span className="font-bold text-red-500 text-xl">${totalExpenses.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
            <span className="font-medium text-primary">Net Balance</span>
            <span className={`font-bold text-xl ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${netBalance.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>Income vs. Expenses</CardTitle>
          <CardDescription>Monthly comparison of your income and expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Using BarChart from Tremor for simpler setup. Recharts version is more verbose. */}
          <BarChart
            className="mt-6 h-72"
            data={incomeExpenseData}
            index="name"
            categories={["value"]}
            colors={validChartColors.slice(0,2)} // Using first two colors
            yAxisWidth={48}
            valueFormatter={(number: number) => `$${Intl.NumberFormat('us').format(number).toString()}`}
          />
        </CardContent>
      </Card>
      
      {expenseBreakdownData.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>How your expenses are distributed across categories.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {/* Using DonutChart from Tremor */}
            <DonutChart
              className="mt-6 h-80 w-full max-w-lg"
              data={expenseBreakdownData}
              category="value"
              index="name"
              colors={validChartColors}
              valueFormatter={(number: number) => `$${Intl.NumberFormat('us').format(number).toString()}`}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// NOTE: Tremor is used here for charts for simplicity.
// If strictly Shadcn/Recharts is required, the chart implementation would be similar to `components/ui/chart.tsx`
// but tailored for Bar and Pie/Donut charts using the data prepared here.
// Example using Shadcn/Recharts would involve:
// import { Bar, BarChart as RechartsBarChart, Pie, PieChart as RechartsPieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
// import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
// And then constructing the charts with these components.
