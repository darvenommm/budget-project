import type { Prisma } from '@prisma/client';

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
  description?: string | undefined;
  date: Date;
}

export interface UpdateTransactionData {
  categoryId?: string | undefined;
  amount?: Decimal | undefined;
  type?: TransactionType | undefined;
  description?: string | null | undefined;
  date?: Date | undefined;
}

export interface TransactionFilter {
  userId: string;
  categoryId?: string | undefined;
  type?: TransactionType | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  totalSpent: Decimal;
}
