import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Prisma } from '@prisma/client';
import { GoalService } from '../../src/modules/goals/application/goal.service.ts';
import type { GoalRepository } from '../../src/modules/goals/domain/goal.repository.ts';
import type { Goal } from '../../src/modules/goals/domain/goal.entity.ts';

const Decimal = Prisma.Decimal;

// Helper for testing async rejections (Bun test types don't properly type expect().rejects as Promise)
async function expectToRejectWith(promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected promise to reject but it resolved') {
      throw error;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(message);
  }
}

describe('GoalService', () => {
  const createMockGoal = (overrides: Partial<Goal> = {}): Goal => ({
    id: 'goal-123',
    userId: 'user-123',
    name: 'Test Goal',
    targetAmount: new Decimal(1000),
    currentAmount: new Decimal(0),
    deadline: null,
    createdAt: new Date(),
    ...overrides,
  });

  // Store mock functions separately to avoid unbound-method issues
  const findByIdMock = mock(() => Promise.resolve(null as Goal | null));
  const findByUserIdMock = mock(() => Promise.resolve([] as Goal[]));
  const createGoalMock = mock(() => Promise.resolve(createMockGoal()));
  const updateGoalMock = mock(() => Promise.resolve(createMockGoal()));
  const deleteGoalMock = mock(() => Promise.resolve());
  const addDepositMock = mock(() => Promise.resolve(createMockGoal()));

  const mockGoalRepository: GoalRepository = {
    findById: findByIdMock,
    findByUserId: findByUserIdMock,
    create: createGoalMock,
    update: updateGoalMock,
    delete: deleteGoalMock,
    addDeposit: addDepositMock,
  };

  let goalService: GoalService;

  beforeEach(() => {
    findByIdMock.mockReset();
    findByUserIdMock.mockReset();
    createGoalMock.mockReset();
    updateGoalMock.mockReset();
    deleteGoalMock.mockReset();
    addDepositMock.mockReset();
    goalService = new GoalService(mockGoalRepository);
  });

  describe('create', () => {
    it('should create a new goal', async () => {
      const mockGoal = createMockGoal({
        name: 'New Car',
        targetAmount: new Decimal(10000),
        deadline: new Date('2025-12-31'),
      });

      createGoalMock.mockResolvedValue(mockGoal);

      const result = await goalService.create('user-123', {
        name: 'New Car',
        targetAmount: 10000,
        deadline: '2025-12-31',
      });

      expect(result.id).toBe('goal-123');
      expect(result.name).toBe('New Car');
      expect(createGoalMock).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all goals for user', async () => {
      const mockGoals = [
        createMockGoal({ id: 'goal-1', name: 'Goal 1', currentAmount: new Decimal(500) }),
        createMockGoal({ id: 'goal-2', name: 'Goal 2', targetAmount: new Decimal(2000) }),
      ];

      findByUserIdMock.mockResolvedValue(mockGoals);

      const result = await goalService.getAll('user-123');

      expect(result).toHaveLength(2);
      expect(findByUserIdMock).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getById', () => {
    it('should return goal if found and owned by user', async () => {
      const mockGoal = createMockGoal();

      findByIdMock.mockResolvedValue(mockGoal);

      const result = await goalService.getById('user-123', 'goal-123');

      expect(result.id).toBe('goal-123');
    });

    it('should throw error if goal not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWith(goalService.getById('user-123', 'goal-123'), 'Goal not found');
    });

    it('should throw error if goal belongs to another user', async () => {
      findByIdMock.mockResolvedValue(createMockGoal({ userId: 'other-user' }));

      await expectToRejectWith(goalService.getById('user-123', 'goal-123'), 'Goal not found');
    });
  });

  describe('deposit', () => {
    it('should add deposit to goal', async () => {
      const existingGoal = createMockGoal();
      const updatedGoal = createMockGoal({ currentAmount: new Decimal(500) });

      findByIdMock.mockResolvedValue(existingGoal);
      addDepositMock.mockResolvedValue(updatedGoal);

      const result = await goalService.deposit('user-123', 'goal-123', 500);

      expect(Number(result.currentAmount)).toBe(500);
      expect(addDepositMock).toHaveBeenCalled();
    });

    it('should throw error if deposit amount is not positive', async () => {
      findByIdMock.mockResolvedValue(createMockGoal());

      await expectToRejectWith(
        goalService.deposit('user-123', 'goal-123', 0),
        'Deposit amount must be positive',
      );
    });

    it('should throw error if goal not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWith(goalService.deposit('user-123', 'goal-123', 500), 'Goal not found');
    });
  });

  describe('delete', () => {
    it('should delete goal if found and owned by user', async () => {
      findByIdMock.mockResolvedValue(createMockGoal());

      await goalService.delete('user-123', 'goal-123');

      expect(deleteGoalMock).toHaveBeenCalledWith('goal-123');
    });

    it('should throw error if goal not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWith(goalService.delete('user-123', 'goal-123'), 'Goal not found');
    });
  });
});
