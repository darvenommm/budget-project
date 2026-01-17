import { prisma } from '../../../shared/database/index.js';
import type {
  Budget,
  BudgetLimit,
  BudgetWithLimits,
  CreateBudgetData,
  CreateBudgetLimitData,
  UpdateBudgetLimitData,
} from '../domain/budget.entity.js';
import type { BudgetRepository } from '../domain/budget.repository.js';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.js';

export class PrismaBudgetRepository implements BudgetRepository {
  @LatencyHistogram('db_budget')
  async findById(id: string): Promise<Budget | null> {
    return prisma.budget.findUnique({ where: { id } });
  }

  @LatencyHistogram('db_budget')
  async findByIdWithLimits(id: string): Promise<BudgetWithLimits | null> {
    return prisma.budget.findUnique({
      where: { id },
      include: {
        limits: {
          include: {
            category: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });
  }

  @LatencyHistogram('db_budget')
  async findByUserIdAndPeriod(userId: string, month: number, year: number): Promise<Budget | null> {
    return prisma.budget.findUnique({
      where: { userId_month_year: { userId, month, year } },
    });
  }

  @LatencyHistogram('db_budget')
  async findByUserIdWithLimits(userId: string, month: number, year: number): Promise<BudgetWithLimits | null> {
    return prisma.budget.findUnique({
      where: { userId_month_year: { userId, month, year } },
      include: {
        limits: {
          include: {
            category: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });
  }

  @LatencyHistogram('db_budget')
  async findAllByUserId(userId: string): Promise<Budget[]> {
    return prisma.budget.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  @LatencyHistogram('db_budget')
  async create(data: CreateBudgetData): Promise<Budget> {
    return prisma.budget.create({ data });
  }

  @LatencyHistogram('db_budget')
  async delete(id: string): Promise<void> {
    await prisma.budget.delete({ where: { id } });
  }

  @LatencyHistogram('db_budget_limit')
  async findLimitById(id: string): Promise<BudgetLimit | null> {
    return prisma.budgetLimit.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  @LatencyHistogram('db_budget_limit')
  async findLimitByBudgetAndCategory(budgetId: string, categoryId: string): Promise<BudgetLimit | null> {
    return prisma.budgetLimit.findUnique({
      where: { budgetId_categoryId: { budgetId, categoryId } },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  @LatencyHistogram('db_budget_limit')
  async createLimit(data: CreateBudgetLimitData): Promise<BudgetLimit> {
    return prisma.budgetLimit.create({
      data,
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  @LatencyHistogram('db_budget_limit')
  async updateLimit(id: string, data: UpdateBudgetLimitData): Promise<BudgetLimit> {
    return prisma.budgetLimit.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  @LatencyHistogram('db_budget_limit')
  async deleteLimit(id: string): Promise<void> {
    await prisma.budgetLimit.delete({ where: { id } });
  }
}
