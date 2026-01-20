import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Prisma } from '@prisma/client';
import { TransactionService } from '../../src/modules/transactions/application/transaction.service.ts';
import type { TransactionRepository } from '../../src/modules/transactions/domain/transaction.repository.ts';
import type { BudgetRepository } from '../../src/modules/budgets/domain/budget.repository.ts';
import type { CategoryRepository } from '../../src/modules/categories/domain/category.repository.ts';
import type { Transaction, CategorySpending } from '../../src/modules/transactions/domain/transaction.entity.ts';
import type { Category } from '../../src/modules/categories/domain/category.entity.ts';
import type { BudgetWithLimits } from '../../src/modules/budgets/domain/budget.entity.ts';
import { NotFoundError } from '../../src/shared/errors/index.ts';

const Decimal = Prisma.Decimal;

// Helper for testing async rejections
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function expectToRejectWithError(promise: Promise<unknown>, errorClass: any): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected promise to reject but it resolved') {
      throw error;
    }
    expect(error).toBeInstanceOf(errorClass);
  }
}

describe('TransactionService', () => {
  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: 'txn-123',
    userId: 'user-123',
    categoryId: 'cat-123',
    amount: new Decimal(100),
    type: 'EXPENSE',
    description: 'Test transaction',
    date: new Date('2025-01-15'),
    createdAt: new Date(),
    category: {
      id: 'cat-123',
      name: 'Food',
      icon: null,
    },
    ...overrides,
  });

  const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
    id: 'cat-123',
    userId: 'user-123',
    name: 'Food',
    icon: null,
    isDefault: true,
    ...overrides,
  });

  const findByIdMock = mock(() => Promise.resolve(null as Transaction | null));
  const findByFilterMock = mock(() => Promise.resolve([] as Transaction[]));
  const createTransactionMock = mock(() => Promise.resolve(createMockTransaction()));
  const updateTransactionMock = mock(() => Promise.resolve(createMockTransaction()));
  const deleteTransactionMock = mock(() => Promise.resolve());
  const getCategorySpendingMock = mock(() => Promise.resolve(new Decimal(0)));
  const getAllCategorySpendingsMock = mock(() => Promise.resolve([] as CategorySpending[]));

  const mockTransactionRepository: TransactionRepository = {
    findById: findByIdMock,
    findByFilter: findByFilterMock,
    create: createTransactionMock,
    update: updateTransactionMock,
    delete: deleteTransactionMock,
    getCategorySpendingForMonth: getCategorySpendingMock,
    getAllCategorySpendingsForMonth: getAllCategorySpendingsMock,
  };

  const findByUserIdWithLimitsMock = mock(() => Promise.resolve(null as BudgetWithLimits | null));

  const mockBudgetRepository = {
    findByUserIdWithLimits: findByUserIdWithLimitsMock,
  } as unknown as BudgetRepository;

  const findCategoryByIdMock = mock(() => Promise.resolve(null as Category | null));

  const mockCategoryRepository = {
    findById: findCategoryByIdMock,
  } as unknown as CategoryRepository;

  let transactionService: TransactionService;

  beforeEach(() => {
    findByIdMock.mockReset();
    findByFilterMock.mockReset();
    createTransactionMock.mockReset();
    updateTransactionMock.mockReset();
    deleteTransactionMock.mockReset();
    getCategorySpendingMock.mockReset();
    getAllCategorySpendingsMock.mockReset();
    findByUserIdWithLimitsMock.mockReset();
    findCategoryByIdMock.mockReset();

    transactionService = new TransactionService(
      mockTransactionRepository,
      mockBudgetRepository,
      mockCategoryRepository,
    );
  });

  describe('getAll', () => {
    it('should return all transactions for user', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'txn-1' }),
        createMockTransaction({ id: 'txn-2' }),
      ];
      findByFilterMock.mockResolvedValue(mockTransactions);

      const result = await transactionService.getAll('user-123');

      expect(result).toHaveLength(2);
      expect(findByFilterMock).toHaveBeenCalled();
    });

    it('should apply filters when provided', async () => {
      findByFilterMock.mockResolvedValue([]);

      await transactionService.getAll('user-123', {
        categoryId: 'cat-123',
        type: 'EXPENSE',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(findByFilterMock).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return transaction if found and owned by user', async () => {
      const mockTransaction = createMockTransaction();
      findByIdMock.mockResolvedValue(mockTransaction);

      const result = await transactionService.getById('user-123', 'txn-123');

      expect(result.id).toBe('txn-123');
    });

    it('should throw NotFoundError if transaction not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        transactionService.getById('user-123', 'txn-123'),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if transaction belongs to another user', async () => {
      findByIdMock.mockResolvedValue(createMockTransaction({ userId: 'other-user' }));

      await expectToRejectWithError(
        transactionService.getById('user-123', 'txn-123'),
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      const mockCategory = createMockCategory();
      const mockTransaction = createMockTransaction();

      findCategoryByIdMock.mockResolvedValue(mockCategory);
      createTransactionMock.mockResolvedValue(mockTransaction);

      const result = await transactionService.create('user-123', {
        categoryId: 'cat-123',
        amount: 100,
        type: 'EXPENSE',
        date: '2025-01-15',
      });

      expect(result.id).toBe('txn-123');
      expect(createTransactionMock).toHaveBeenCalled();
    });

    it('should throw NotFoundError if category not found', async () => {
      findCategoryByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        transactionService.create('user-123', {
          categoryId: 'cat-123',
          amount: 100,
          type: 'EXPENSE',
          date: '2025-01-15',
        }),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if category belongs to another user', async () => {
      findCategoryByIdMock.mockResolvedValue(createMockCategory({ userId: 'other-user' }));

      await expectToRejectWithError(
        transactionService.create('user-123', {
          categoryId: 'cat-123',
          amount: 100,
          type: 'EXPENSE',
          date: '2025-01-15',
        }),
        NotFoundError,
      );
    });
  });

  describe('update', () => {
    it('should update an existing transaction', async () => {
      const mockTransaction = createMockTransaction();
      findByIdMock.mockResolvedValue(mockTransaction);
      updateTransactionMock.mockResolvedValue({ ...mockTransaction, description: 'Updated' });

      const result = await transactionService.update('user-123', 'txn-123', {
        description: 'Updated',
      });

      expect(updateTransactionMock).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundError if transaction not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        transactionService.update('user-123', 'txn-123', { description: 'Updated' }),
        NotFoundError,
      );
    });

    it('should validate category when updating categoryId', async () => {
      const mockTransaction = createMockTransaction();
      findByIdMock.mockResolvedValue(mockTransaction);
      findCategoryByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        transactionService.update('user-123', 'txn-123', { categoryId: 'new-cat' }),
        NotFoundError,
      );
    });
  });

  describe('delete', () => {
    it('should delete transaction if found and owned by user', async () => {
      findByIdMock.mockResolvedValue(createMockTransaction());

      await transactionService.delete('user-123', 'txn-123');

      expect(deleteTransactionMock).toHaveBeenCalledWith('txn-123');
    });

    it('should throw NotFoundError if transaction not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        transactionService.delete('user-123', 'txn-123'),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if transaction belongs to another user', async () => {
      findByIdMock.mockResolvedValue(createMockTransaction({ userId: 'other-user' }));

      await expectToRejectWithError(
        transactionService.delete('user-123', 'txn-123'),
        NotFoundError,
      );
    });
  });

  describe('getMonthlySpending', () => {
    it('should return category spending for the month', async () => {
      const mockSpending: CategorySpending[] = [
        { categoryId: 'cat-1', categoryName: 'Food', totalSpent: new Decimal(500) },
        { categoryId: 'cat-2', categoryName: 'Transport', totalSpent: new Decimal(200) },
      ];
      getAllCategorySpendingsMock.mockResolvedValue(mockSpending);

      const result = await transactionService.getMonthlySpending('user-123', 1, 2025);

      expect(result).toHaveLength(2);
      expect(getAllCategorySpendingsMock).toHaveBeenCalledWith('user-123', 1, 2025);
    });
  });
});
