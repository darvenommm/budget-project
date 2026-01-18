import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;
import { prisma } from '../../../shared/database/index.js';
import type {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilter,
  CategorySpending,
} from '../domain/transaction.entity.js';
import type { TransactionRepository } from '../domain/transaction.repository.js';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.js';

export class PrismaTransactionRepository implements TransactionRepository {
  @LatencyHistogram('db_transaction')
  async findById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  @LatencyHistogram('db_transaction')
  async findByFilter(filter: TransactionFilter): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        userId: filter.userId,
        ...(filter.categoryId && { categoryId: filter.categoryId }),
        ...(filter.type && { type: filter.type }),
        ...(filter.startDate && { date: { gte: filter.startDate } }),
        ...(filter.endDate && { date: { lte: filter.endDate } }),
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  @LatencyHistogram('db_transaction')
  async create(data: CreateTransactionData): Promise<Transaction> {
    return prisma.transaction.create({
      data,
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  @LatencyHistogram('db_transaction')
  async update(id: string, data: UpdateTransactionData): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  @LatencyHistogram('db_transaction')
  async delete(id: string): Promise<void> {
    await prisma.transaction.delete({ where: { id } });
  }

  @LatencyHistogram('db_transaction')
  async getCategorySpendingForMonth(
    userId: string,
    categoryId: string,
    month: number,
    year: number
  ): Promise<Decimal> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ?? new Decimal(0);
  }

  @LatencyHistogram('db_transaction')
  async getAllCategorySpendingsForMonth(
    userId: string,
    month: number,
    year: number
  ): Promise<CategorySpending[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const categoryIds = result.map((r) => r.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return result.map((r) => ({
      categoryId: r.categoryId,
      categoryName: categoryMap.get(r.categoryId) ?? 'Unknown',
      totalSpent: r._sum.amount ?? new Decimal(0),
    }));
  }
}
