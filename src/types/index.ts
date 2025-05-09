export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string; // Consider using Date object if more manipulation is needed, string for simplicity now
  description?: string;
  categoryId: string; // To link transaction to a category
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense'; // To distinguish income categories from expense categories
  icon?: string; // Optional: Lucide icon name string
}

// AI Suggestion types from the existing flow
export type AISuggestion = {
  category: string;
  adjustment: string;
};

export type AISuggestionsOutput = {
  suggestions: AISuggestion[];
};
