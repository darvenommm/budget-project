import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Prisma } from '@prisma/client';
import { BudgetService } from '../../src/modules/budgets/application/budget.service.ts';
import type { BudgetRepository } from '../../src/modules/budgets/domain/budget.repository.ts';
import type { CategoryRepository } from '../../src/modules/categories/domain/category.repository.ts';
import type { Budget, BudgetLimit, BudgetWithLimits } from '../../src/modules/budgets/domain/budget.entity.ts';
import type { Category } from '../../src/modules/categories/domain/category.entity.ts';
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

describe('BudgetService', () => {
  const createMockBudget = (overrides: Partial<Budget> = {}): Budget => ({
    id: 'budget-123',
    userId: 'user-123',
    month: 1,
    year: 2025,
    createdAt: new Date(),
    ...overrides,
  });

  const createMockBudgetWithLimits = (overrides: Partial<BudgetWithLimits> = {}): BudgetWithLimits => ({
    ...createMockBudget(),
    limits: [],
    ...overrides,
  });

  const createMockBudgetLimit = (overrides: Partial<BudgetLimit> = {}): BudgetLimit => ({
    id: 'limit-123',
    budgetId: 'budget-123',
    categoryId: 'cat-123',
    limitAmount: new Decimal(1000),
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

  const findByIdMock = mock(() => Promise.resolve(null as Budget | null));
  const findByIdWithLimitsMock = mock(() => Promise.resolve(null as BudgetWithLimits | null));
  const findByUserIdAndPeriodMock = mock(() => Promise.resolve(null as Budget | null));
  const findByUserIdWithLimitsMock = mock(() => Promise.resolve(null as BudgetWithLimits | null));
  const findAllByUserIdMock = mock(() => Promise.resolve([] as Budget[]));
  const createBudgetMock = mock(() => Promise.resolve(createMockBudget()));
  const deleteBudgetMock = mock(() => Promise.resolve());
  const findLimitByIdMock = mock(() => Promise.resolve(null as BudgetLimit | null));
  const findLimitByBudgetAndCategoryMock = mock(() => Promise.resolve(null as BudgetLimit | null));
  const createLimitMock = mock(() => Promise.resolve(createMockBudgetLimit()));
  const updateLimitMock = mock(() => Promise.resolve(createMockBudgetLimit()));
  const deleteLimitMock = mock(() => Promise.resolve());

  const mockBudgetRepository: BudgetRepository = {
    findById: findByIdMock,
    findByIdWithLimits: findByIdWithLimitsMock,
    findByUserIdAndPeriod: findByUserIdAndPeriodMock,
    findByUserIdWithLimits: findByUserIdWithLimitsMock,
    findAllByUserId: findAllByUserIdMock,
    create: createBudgetMock,
    delete: deleteBudgetMock,
    findLimitById: findLimitByIdMock,
    findLimitByBudgetAndCategory: findLimitByBudgetAndCategoryMock,
    createLimit: createLimitMock,
    updateLimit: updateLimitMock,
    deleteLimit: deleteLimitMock,
  };

  const findCategoryByIdMock = mock(() => Promise.resolve(null as Category | null));

  const mockCategoryRepository = {
    findById: findCategoryByIdMock,
  } as unknown as CategoryRepository;

  let budgetService: BudgetService;

  beforeEach(() => {
    findByIdMock.mockReset();
    findByIdWithLimitsMock.mockReset();
    findByUserIdAndPeriodMock.mockReset();
    findByUserIdWithLimitsMock.mockReset();
    findAllByUserIdMock.mockReset();
    createBudgetMock.mockReset();
    deleteBudgetMock.mockReset();
    findLimitByIdMock.mockReset();
    findLimitByBudgetAndCategoryMock.mockReset();
    createLimitMock.mockReset();
    updateLimitMock.mockReset();
    deleteLimitMock.mockReset();
    findCategoryByIdMock.mockReset();

    budgetService = new BudgetService(mockBudgetRepository, mockCategoryRepository);
  });

  describe('getOrCreateBudget', () => {
    it('should return existing budget if found', async () => {
      const mockBudget = createMockBudgetWithLimits();
      findByUserIdWithLimitsMock.mockResolvedValue(mockBudget);

      const result = await budgetService.getOrCreateBudget('user-123', 1, 2025);

      expect(result.id).toBe('budget-123');
      expect(createBudgetMock).not.toHaveBeenCalled();
    });

    it('should create new budget if not found', async () => {
      findByUserIdWithLimitsMock.mockResolvedValue(null);
      createBudgetMock.mockResolvedValue(createMockBudget());

      const result = await budgetService.getOrCreateBudget('user-123', 1, 2025);

      expect(result.id).toBe('budget-123');
      expect(createBudgetMock).toHaveBeenCalled();
    });
  });

  describe('getBudget', () => {
    it('should return budget if found', async () => {
      const mockBudget = createMockBudgetWithLimits();
      findByUserIdWithLimitsMock.mockResolvedValue(mockBudget);

      const result = await budgetService.getBudget('user-123', 1, 2025);

      expect(result?.id).toBe('budget-123');
    });

    it('should return null if budget not found', async () => {
      findByUserIdWithLimitsMock.mockResolvedValue(null);

      const result = await budgetService.getBudget('user-123', 1, 2025);

      expect(result).toBeNull();
    });
  });

  describe('getAllBudgets', () => {
    it('should return all budgets for user', async () => {
      const mockBudgets = [
        createMockBudget({ id: 'budget-1', month: 1 }),
        createMockBudget({ id: 'budget-2', month: 2 }),
      ];
      findAllByUserIdMock.mockResolvedValue(mockBudgets);

      const result = await budgetService.getAllBudgets('user-123');

      expect(result).toHaveLength(2);
      expect(findAllByUserIdMock).toHaveBeenCalledWith('user-123');
    });
  });

  describe('setLimit', () => {
    it('should create new limit if not exists', async () => {
      const mockCategory = createMockCategory();
      const mockBudget = createMockBudgetWithLimits();
      const mockLimit = createMockBudgetLimit();

      findCategoryByIdMock.mockResolvedValue(mockCategory);
      findByUserIdWithLimitsMock.mockResolvedValue(mockBudget);
      findLimitByBudgetAndCategoryMock.mockResolvedValue(null);
      createLimitMock.mockResolvedValue(mockLimit);

      const result = await budgetService.setLimit('user-123', 1, 2025, {
        categoryId: 'cat-123',
        limitAmount: 1000,
      });

      expect(result.id).toBe('limit-123');
      expect(createLimitMock).toHaveBeenCalled();
    });

    it('should update existing limit', async () => {
      const mockCategory = createMockCategory();
      const mockBudget = createMockBudgetWithLimits();
      const existingLimit = createMockBudgetLimit();
      const updatedLimit = createMockBudgetLimit({ limitAmount: new Decimal(2000) });

      findCategoryByIdMock.mockResolvedValue(mockCategory);
      findByUserIdWithLimitsMock.mockResolvedValue(mockBudget);
      findLimitByBudgetAndCategoryMock.mockResolvedValue(existingLimit);
      updateLimitMock.mockResolvedValue(updatedLimit);

      const result = await budgetService.setLimit('user-123', 1, 2025, {
        categoryId: 'cat-123',
        limitAmount: 2000,
      });

      expect(updateLimitMock).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundError if category not found', async () => {
      findCategoryByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        budgetService.setLimit('user-123', 1, 2025, {
          categoryId: 'cat-123',
          limitAmount: 1000,
        }),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if category belongs to another user', async () => {
      findCategoryByIdMock.mockResolvedValue(createMockCategory({ userId: 'other-user' }));

      await expectToRejectWithError(
        budgetService.setLimit('user-123', 1, 2025, {
          categoryId: 'cat-123',
          limitAmount: 1000,
        }),
        NotFoundError,
      );
    });
  });

  describe('removeLimit', () => {
    it('should remove existing limit', async () => {
      const mockBudget = createMockBudget();
      const mockLimit = createMockBudgetLimit();

      findByUserIdAndPeriodMock.mockResolvedValue(mockBudget);
      findLimitByBudgetAndCategoryMock.mockResolvedValue(mockLimit);

      await budgetService.removeLimit('user-123', 1, 2025, 'cat-123');

      expect(deleteLimitMock).toHaveBeenCalledWith('limit-123');
    });

    it('should throw NotFoundError if budget not found', async () => {
      findByUserIdAndPeriodMock.mockResolvedValue(null);

      await expectToRejectWithError(
        budgetService.removeLimit('user-123', 1, 2025, 'cat-123'),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if limit not found', async () => {
      findByUserIdAndPeriodMock.mockResolvedValue(createMockBudget());
      findLimitByBudgetAndCategoryMock.mockResolvedValue(null);

      await expectToRejectWithError(
        budgetService.removeLimit('user-123', 1, 2025, 'cat-123'),
        NotFoundError,
      );
    });
  });

  describe('deleteBudget', () => {
    it('should delete budget if found and owned by user', async () => {
      findByIdMock.mockResolvedValue(createMockBudget());

      await budgetService.deleteBudget('user-123', 'budget-123');

      expect(deleteBudgetMock).toHaveBeenCalledWith('budget-123');
    });

    it('should throw NotFoundError if budget not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        budgetService.deleteBudget('user-123', 'budget-123'),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if budget belongs to another user', async () => {
      findByIdMock.mockResolvedValue(createMockBudget({ userId: 'other-user' }));

      await expectToRejectWithError(
        budgetService.deleteBudget('user-123', 'budget-123'),
        NotFoundError,
      );
    });
  });
});
