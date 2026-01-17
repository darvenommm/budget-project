import { Decimal } from '@prisma/client/runtime/library';

export interface Budget {
  id: string;
  userId: string;
  month: number;
  year: number;
  createdAt: Date;
  limits?: BudgetLimit[];
}

export interface BudgetLimit {
  id: string;
  budgetId: string;
  categoryId: string;
  limitAmount: Decimal;
  category?: {
    id: string;
    name: string;
    icon: string | null;
  };
}

export interface CreateBudgetData {
  userId: string;
  month: number;
  year: number;
}

export interface CreateBudgetLimitData {
  budgetId: string;
  categoryId: string;
  limitAmount: Decimal;
}

export interface UpdateBudgetLimitData {
  limitAmount: Decimal;
}

export interface BudgetWithLimits extends Budget {
  limits: BudgetLimit[];
}
