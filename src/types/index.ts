
export interface Transaction {
  id: string; // Keep client-side ID for keys, map from $id on fetch/save if needed
  title: string;
  amount: number;
  date: string; // ISO string format
  description?: string;
  categoryId: string;
}

export interface Category {
  id: string; // Client-side ID
  name: string;
  type: 'income' | 'expense';
  icon?: string; // Lucide icon name string
}

export interface Board {
  id: string; // Corresponds to Appwrite $id
  userId: string; // Foreign key to Appwrite user
  name: string;
  categories: Category[]; // Still store parsed objects client-side
  transactions: Transaction[]; // Still store parsed objects client-side
  createdAt: string; // Corresponds to Appwrite $createdAt
  sharedWith?: string[]; // Store parsed array client-side
}

// AI Suggestion types from the existing flow
export type AISuggestion = {
  category: string;
  adjustment: string;
};

export type AISuggestionsOutput = {
  suggestions: AISuggestion[];
};

export interface Bill {
  id: string; // Corresponds to Appwrite $id
  userId: string; // Foreign key to Appwrite user
  title: string;
  amount: number;
  dueDate: string; // ISO string format
  isPaid: boolean;
  paidDate?: string | null; // ISO string format, use null for Appwrite compatibility
  notes?: string;
  categoryId: string; // Category for the bill expense
}
