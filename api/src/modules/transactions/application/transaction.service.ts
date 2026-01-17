import { Decimal } from '@prisma/client/runtime/library';
import { TransactionRepository } from '../domain/transaction.repository.js';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilter,
  TransactionType,
  CategorySpending,
} from '../domain/transaction.entity.js';
import { BudgetRepository } from '../../budgets/domain/budget.repository.js';
import { CategoryRepository } from '../../categories/domain/category.repository.js';
import { publishEvent, TransactionCreatedEvent } from '../../../shared/rabbitmq/index.js';
import { logger } from '../../../shared/logger/index.js';

export interface CreateTransactionInput {
  categoryId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  date: string;
}

export interface UpdateTransactionInput {
  categoryId?: string;
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  date?: string;
}

export interface TransactionFilterInput {
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

export class TransactionService {
  constructor(
    private transactionRepository: TransactionRepository,
    private budgetRepository: BudgetRepository,
    private categoryRepository: CategoryRepository
  ) {}

  async getAll(userId: string, filter?: TransactionFilterInput): Promise<Transaction[]> {
    const transactionFilter: TransactionFilter = {
      userId,
      categoryId: filter?.categoryId,
      type: filter?.type,
      startDate: filter?.startDate ? new Date(filter.startDate) : undefined,
      endDate: filter?.endDate ? new Date(filter.endDate) : undefined,
    };

    return this.transactionRepository.findByFilter(transactionFilter);
  }

  async getById(userId: string, transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  async create(userId: string, input: CreateTransactionInput): Promise<Transaction> {
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.userId !== userId) {
      throw new Error('Category not found');
    }

    const data: CreateTransactionData = {
      userId,
      categoryId: input.categoryId,
      amount: new Decimal(input.amount),
      type: input.type,
      description: input.description,
      date: new Date(input.date),
    };

    const transaction = await this.transactionRepository.create(data);
    logger.info('Transaction created', { transactionId: transaction.id, type: input.type });

    if (input.type === 'EXPENSE') {
      await this.checkBudgetLimitAndNotify(userId, input.categoryId, transaction);
    }

    return transaction;
  }

  async update(
    userId: string,
    transactionId: string,
    input: UpdateTransactionInput
  ): Promise<Transaction> {
    const existing = await this.transactionRepository.findById(transactionId);
    if (!existing || existing.userId !== userId) {
      throw new Error('Transaction not found');
    }

    if (input.categoryId) {
      const category = await this.categoryRepository.findById(input.categoryId);
      if (!category || category.userId !== userId) {
        throw new Error('Category not found');
      }
    }

    const data: UpdateTransactionData = {
      categoryId: input.categoryId,
      amount: input.amount !== undefined ? new Decimal(input.amount) : undefined,
      type: input.type,
      description: input.description,
      date: input.date ? new Date(input.date) : undefined,
    };

    const transaction = await this.transactionRepository.update(transactionId, data);
    logger.info('Transaction updated', { transactionId });

    return transaction;
  }

  async delete(userId: string, transactionId: string): Promise<void> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new Error('Transaction not found');
    }

    await this.transactionRepository.delete(transactionId);
    logger.info('Transaction deleted', { transactionId });
  }

  async getMonthlySpending(
    userId: string,
    month: number,
    year: number
  ): Promise<CategorySpending[]> {
    return this.transactionRepository.getAllCategorySpendingsForMonth(userId, month, year);
  }

  private async checkBudgetLimitAndNotify(
    userId: string,
    categoryId: string,
    transaction: Transaction
  ): Promise<void> {
    const transactionDate = transaction.date;
    const month = transactionDate.getMonth() + 1;
    const year = transactionDate.getFullYear();

    const budget = await this.budgetRepository.findByUserIdWithLimits(userId, month, year);
    if (!budget) {
      return;
    }

    const limit = budget.limits.find((l) => l.categoryId === categoryId);
    if (!limit) {
      return;
    }

    const currentSpent = await this.transactionRepository.getCategorySpendingForMonth(
      userId,
      categoryId,
      month,
      year
    );

    const limitAmount = Number(limit.limitAmount);
    const spentAmount = Number(currentSpent);

    if (spentAmount >= limitAmount) {
      const categoryName = transaction.category?.name ?? 'Unknown';

      const event: TransactionCreatedEvent = {
        type: 'TRANSACTION_CREATED',
        payload: {
          userId,
          categoryId,
          categoryName,
          amount: Number(transaction.amount),
          budgetId: budget.id,
          currentSpent: spentAmount,
          limitAmount,
        },
      };

      await publishEvent(event);
      logger.info('Budget limit exceeded event published', {
        userId,
        categoryId,
        currentSpent: spentAmount,
        limitAmount,
      });
    }
  }
}
