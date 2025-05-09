"use client";

import type { AISuggestion, AISuggestionsOutput } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useBoards } from "@/hooks/useBoards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lightbulb, Zap } from "lucide-react";
import { suggestBudgetAdjustments, type SuggestBudgetAdjustmentsInput } from "@/ai/flows/suggest-budget-adjustments"; 

export function BudgetAdvisor() {
  const { activeBoard, isLoadingBoards } = useBoards();
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => activeBoard?.categories || [], [activeBoard]);
  const transactions = useMemo(() => activeBoard?.transactions || [], [activeBoard]);

  const handleGetSuggestions = async () => {
    if (!activeBoard) {
        setError("Ingen aktiv tavla vald. Välj en tavla först.");
        return;
    }
    setIsLoadingAI(true);
    setError(null);
    setSuggestions(null);

    const totalIncome = transactions
      .filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        return cat && cat.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesByCategory = categories
      .filter(cat => cat.type === 'expense')
      .map(cat => {
        const categoryTotal = transactions
          .filter(t => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);
        return { category: cat.name, amount: categoryTotal };
      })
      .filter(exp => exp.amount > 0); 

    if (totalIncome <= 0 && expensesByCategory.length === 0) {
        setError("Lägg till inkomst- och utgiftsdata på den aktiva tavlan innan du begär förslag.");
        setIsLoadingAI(false);
        return;
    }
    
    const input: SuggestBudgetAdjustmentsInput = {
      income: totalIncome,
      expenses: expensesByCategory,
    };

    try {
      const result: AISuggestionsOutput = await suggestBudgetAdjustments(input);
      setSuggestions(result.suggestions);
    } catch (e) {
      console.error("Error getting AI suggestions:", e);
      setError("Kunde inte hämta budgetförslag. Försök igen senare.");
    } finally {
      setIsLoadingAI(false);
    }
  };
  
  if (isLoadingBoards) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Laddar tavlor...
      </div>
    );
  }

  if (!activeBoard) {
    return (
        <Card className="shadow-xl">
             <CardHeader>
                <CardTitle className="flex items-center text-2xl font-semibold">
                <Lightbulb className="mr-3 h-7 w-7 text-accent" />
                AI Budgetrådgivare
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertTitle>Ingen Tavla Vald</AlertTitle>
                    <AlertDescription>Välj eller skapa en tavla för att få AI-baserade budgetförslag.</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-semibold">
          <Lightbulb className="mr-3 h-7 w-7 text-accent" />
          AI Budgetrådgivare
        </CardTitle>
        <CardDescription>
          Få personliga förslag för att optimera din budget baserat på data från tavlan: <span className="font-medium text-primary">{activeBoard.name}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-center">
          <Button onClick={handleGetSuggestions} disabled={isLoadingAI || isLoadingBoards} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {isLoadingAI ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Zap className="mr-2 h-5 w-5" />
            )}
            Få Smarta Förslag
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Fel</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {suggestions && suggestions.length > 0 && (
          <div>
            <h3 className="mb-4 text-xl font-semibold text-primary">Här är dina personliga förslag:</h3>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <Card key={index} className="bg-secondary/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-secondary-foreground">{suggestion.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{suggestion.adjustment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {suggestions && suggestions.length === 0 && !error && !isLoadingAI && (
             <Alert>
                <AlertTitle>Inga specifika förslag just nu!</AlertTitle>
                <AlertDescription>Din budget ser balanserad ut för tavlan "{activeBoard.name}", eller så finns det inte tillräckligt med data för specifika råd. Fortsätt spåra!</AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
