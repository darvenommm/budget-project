import { Decimal } from '@prisma/client/runtime/library';
import { BudgetRepository } from '../domain/budget.repository.js';
import { Budget, BudgetLimit, BudgetWithLimits } from '../domain/budget.entity.js';
import { CategoryRepository } from '../../categories/domain/category.repository.js';
import { logger } from '../../../shared/logger/index.js';

export interface CreateBudgetInput {
  month: number;
  year: number;
}

export interface SetLimitInput {
  categoryId: string;
  limitAmount: number;
}

export class BudgetService {
  constructor(
    private budgetRepository: BudgetRepository,
    private categoryRepository: CategoryRepository
  ) {}

  async getOrCreateBudget(userId: string, month: number, year: number): Promise<BudgetWithLimits> {
    let budget = await this.budgetRepository.findByUserIdWithLimits(userId, month, year);

    if (!budget) {
      const created = await this.budgetRepository.create({ userId, month, year });
      budget = { ...created, limits: [] };
      logger.info('Budget created', { budgetId: budget.id, userId, month, year });
    }

    return budget;
  }

  async getBudget(userId: string, month: number, year: number): Promise<BudgetWithLimits | null> {
    return this.budgetRepository.findByUserIdWithLimits(userId, month, year);
  }

  async getAllBudgets(userId: string): Promise<Budget[]> {
    return this.budgetRepository.findAllByUserId(userId);
  }

  async setLimit(
    userId: string,
    month: number,
    year: number,
    input: SetLimitInput
  ): Promise<BudgetLimit> {
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.userId !== userId) {
      throw new Error('Category not found');
    }

    const budget = await this.getOrCreateBudget(userId, month, year);

    const existingLimit = await this.budgetRepository.findLimitByBudgetAndCategory(
      budget.id,
      input.categoryId
    );

    const limitAmount = new Decimal(input.limitAmount);

    if (existingLimit) {
      const updated = await this.budgetRepository.updateLimit(existingLimit.id, { limitAmount });
      logger.info('Budget limit updated', {
        budgetId: budget.id,
        categoryId: input.categoryId,
        limitAmount: input.limitAmount,
      });
      return updated;
    }

    const created = await this.budgetRepository.createLimit({
      budgetId: budget.id,
      categoryId: input.categoryId,
      limitAmount,
    });

    logger.info('Budget limit created', {
      budgetId: budget.id,
      categoryId: input.categoryId,
      limitAmount: input.limitAmount,
    });

    return created;
  }

  async removeLimit(userId: string, month: number, year: number, categoryId: string): Promise<void> {
    const budget = await this.budgetRepository.findByUserIdAndPeriod(userId, month, year);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const limit = await this.budgetRepository.findLimitByBudgetAndCategory(budget.id, categoryId);
    if (!limit) {
      throw new Error('Limit not found');
    }

    await this.budgetRepository.deleteLimit(limit.id);
    logger.info('Budget limit deleted', { budgetId: budget.id, categoryId });
  }

  async deleteBudget(userId: string, budgetId: string): Promise<void> {
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget || budget.userId !== userId) {
      throw new Error('Budget not found');
    }

    await this.budgetRepository.delete(budgetId);
    logger.info('Budget deleted', { budgetId });
  }
}
