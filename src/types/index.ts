export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string; // ISO string format
  description?: string;
  categoryId: string; 
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string; // Lucide icon name string
}

export interface Board {
  id: string;
  name: string;
  categories: Category[];
  transactions: Transaction[];
  createdAt: string; // ISO string format
  sharedWith?: string[]; // Array of emails (mocked sharing)
}

// AI Suggestion types from the existing flow
export type AISuggestion = {
  category: string;
  adjustment: string;
};

export type AISuggestionsOutput = {
  suggestions: AISuggestion[];
};
