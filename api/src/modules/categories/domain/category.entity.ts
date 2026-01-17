export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
}

export interface CreateCategoryData {
  userId: string;
  name: string;
  icon?: string;
  isDefault?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
}

export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Shopping', icon: '🛒' },
  { name: 'Health', icon: '💊' },
  { name: 'Bills', icon: '📄' },
  { name: 'Other', icon: '📦' },
];
