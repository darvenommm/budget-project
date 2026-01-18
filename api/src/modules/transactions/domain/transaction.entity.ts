import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: Decimal;
  type: TransactionType;
  description: string | null;
  date: Date;
  createdAt: Date;
  category?: {
    id: string;
    name: string;
    icon: string | null;
  };
}

export interface CreateTransactionData {
  userId: string;
  categoryId: string;
  amount: Decimal;
  type: TransactionType;
  description?: string;
  date: Date;
}

export interface UpdateTransactionData {
  categoryId?: string;
  amount?: Decimal;
  type?: TransactionType;
  description?: string | null;
  date?: Date;
}

export interface TransactionFilter {
  userId: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  totalSpent: Decimal;
}
