
import type { Category } from '@/types';

// Template for initial categories. IDs will be generated dynamically.
// boardId is removed as categories are now nested within the board document itself (as JSON).
export const INITIAL_BOARD_CATEGORY_TEMPLATES: Omit<Category, 'id'>[] = [
  { name: "Inkomst", type: "income", icon: "TrendingUp", order: 0 },
  { name: "Boende", type: "expense", icon: "Home", order: 0 },
  { name: "Mat & Livsmedel", type: "expense", icon: "Utensils", order: 1 },
  { name: "Transport", type: "expense", icon: "Car", order: 2 },
  { name: "Inköp", type: "expense", icon: "ShoppingCart", order: 3 },
  { name: "Nöje", type: "expense", icon: "Film", order: 4 },
  { name: "Sparande", type: "expense", icon: "PiggyBank", order: 5 },
  { name: "Övrigt", type: "expense", icon: "Archive", order: 6 },
];

export const DEFAULT_BOARD_NAME = "Min Första Tavla";
export const SHOPPING_CATEGORY_NAME = "Inköp";
export const SHOPPING_CATEGORY_ICON = "ShoppingCart";
