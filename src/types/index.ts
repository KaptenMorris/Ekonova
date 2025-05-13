
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
  id: string; // Corresponds to Firestore document ID
  userId: string; // Foreign key to Firebase Auth user UID
  name: string;
  categories: Category[]; // Stored as an array of objects in Firestore
  transactions: Transaction[]; // Stored as an array of objects in Firestore
  createdAt: string; // ISO string, converted from Firestore Timestamp
  sharedWith?: string[]; // Array of user UIDs or emails (depending on sharing strategy)
}

export type AISuggestion = {
  category: string;
  adjustment: string;
};

export type AISuggestionsOutput = {
  suggestions: AISuggestion[];
};

export interface Bill {
  id: string; // Corresponds to Firestore document ID
  userId: string; // Foreign key to Firebase Auth user UID
  title: string;
  amount: number;
  dueDate: string; // ISO string format
  isPaid: boolean;
  paidDate?: string | null; // ISO string format
  notes?: string;
  categoryId: string;
}
