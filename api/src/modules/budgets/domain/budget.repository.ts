import type {
  Budget,
  BudgetLimit,
  BudgetWithLimits,
  CreateBudgetData,
  CreateBudgetLimitData,
  UpdateBudgetLimitData,
} from './budget.entity.ts';

export interface BudgetRepository {
  findById(id: string): Promise<Budget | null>;
  findByIdWithLimits(id: string): Promise<BudgetWithLimits | null>;
  findByUserIdAndPeriod(userId: string, month: number, year: number): Promise<Budget | null>;
  findByUserIdWithLimits(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetWithLimits | null>;
  findAllByUserId(userId: string): Promise<Budget[]>;
  create(data: CreateBudgetData): Promise<Budget>;
  delete(id: string): Promise<void>;

  findLimitById(id: string): Promise<BudgetLimit | null>;
  findLimitByBudgetAndCategory(budgetId: string, categoryId: string): Promise<BudgetLimit | null>;
  createLimit(data: CreateBudgetLimitData): Promise<BudgetLimit>;
  updateLimit(id: string, data: UpdateBudgetLimitData): Promise<BudgetLimit>;
  deleteLimit(id: string): Promise<void>;
}
