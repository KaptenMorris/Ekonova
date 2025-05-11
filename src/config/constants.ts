import type { Category } from '@/types';

// Template for initial categories. IDs will be generated dynamically.
export const INITIAL_BOARD_CATEGORY_TEMPLATES: Omit<Category, 'id' | 'boardId'>[] = [
  { name: "Inkomst", type: "income", icon: "TrendingUp" },
  { name: "Boende", type: "expense", icon: "Home" },
  { name: "Mat & Livsmedel", type: "expense", icon: "Utensils" },
  { name: "Transport", type: "expense", icon: "Car" },
  { name: "Inköp", type: "expense", icon: "ShoppingCart" },
  { name: "Nöje", type: "expense", icon: "Film" },
  { name: "Sparande", type: "expense", icon: "PiggyBank" },
  { name: "Övrigt", type: "expense", icon: "Archive" },
];

export const DEFAULT_BOARD_NAME = "Min Första Tavla";
export const SHOPPING_CATEGORY_NAME = "Inköp";
export const SHOPPING_CATEGORY_ICON = "ShoppingCart";

