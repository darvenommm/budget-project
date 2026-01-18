import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
import { GoalService } from '../../src/modules/goals/application/goal.service.js';

describe('GoalService', () => {
  const mockGoalRepository = {
    findById: mock(() => Promise.resolve(null)),
    findByUserId: mock(() => Promise.resolve([])),
    create: mock(() => Promise.resolve(null)),
    update: mock(() => Promise.resolve(null)),
    delete: mock(() => Promise.resolve()),
    addDeposit: mock(() => Promise.resolve(null)),
  };

  let goalService: GoalService;

  beforeEach(() => {
    mockGoalRepository.findById.mockReset();
    mockGoalRepository.findByUserId.mockReset();
    mockGoalRepository.create.mockReset();
    mockGoalRepository.update.mockReset();
    mockGoalRepository.delete.mockReset();
    mockGoalRepository.addDeposit.mockReset();
    goalService = new GoalService(mockGoalRepository);
  });

  describe('create', () => {
    it('should create a new goal', async () => {
      const mockGoal = {
        id: 'goal-123',
        userId: 'user-123',
        name: 'New Car',
        targetAmount: new Decimal(10000),
        currentAmount: new Decimal(0),
        deadline: new Date('2025-12-31'),
        createdAt: new Date(),
      };

      mockGoalRepository.create.mockResolvedValue(mockGoal);

      const result = await goalService.create('user-123', {
        name: 'New Car',
        targetAmount: 10000,
        deadline: '2025-12-31',
      });

      expect(result.id).toBe('goal-123');
      expect(result.name).toBe('New Car');
      expect(mockGoalRepository.create).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all goals for user', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          userId: 'user-123',
          name: 'Goal 1',
          targetAmount: new Decimal(1000),
          currentAmount: new Decimal(500),
          deadline: null,
          createdAt: new Date(),
        },
        {
          id: 'goal-2',
          userId: 'user-123',
          name: 'Goal 2',
          targetAmount: new Decimal(2000),
          currentAmount: new Decimal(0),
          deadline: null,
          createdAt: new Date(),
        },
      ];

      mockGoalRepository.findByUserId.mockResolvedValue(mockGoals);

      const result = await goalService.getAll('user-123');

      expect(result).toHaveLength(2);
      expect(mockGoalRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getById', () => {
    it('should return goal if found and owned by user', async () => {
      const mockGoal = {
        id: 'goal-123',
        userId: 'user-123',
        name: 'Test Goal',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(0),
        deadline: null,
        createdAt: new Date(),
      };

      mockGoalRepository.findById.mockResolvedValue(mockGoal);

      const result = await goalService.getById('user-123', 'goal-123');

      expect(result.id).toBe('goal-123');
    });

    it('should throw error if goal not found', async () => {
      mockGoalRepository.findById.mockResolvedValue(null);

      expect(goalService.getById('user-123', 'goal-123')).rejects.toThrow('Goal not found');
    });

    it('should throw error if goal belongs to another user', async () => {
      mockGoalRepository.findById.mockResolvedValue({
        id: 'goal-123',
        userId: 'other-user',
        name: 'Test Goal',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(0),
        deadline: null,
        createdAt: new Date(),
      });

      expect(goalService.getById('user-123', 'goal-123')).rejects.toThrow('Goal not found');
    });
  });

  describe('deposit', () => {
    it('should add deposit to goal', async () => {
      const existingGoal = {
        id: 'goal-123',
        userId: 'user-123',
        name: 'Test Goal',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(0),
        deadline: null,
        createdAt: new Date(),
      };

      const updatedGoal = {
        ...existingGoal,
        currentAmount: new Decimal(500),
      };

      mockGoalRepository.findById.mockResolvedValue(existingGoal);
      mockGoalRepository.addDeposit.mockResolvedValue(updatedGoal);

      const result = await goalService.deposit('user-123', 'goal-123', 500);

      expect(Number(result.currentAmount)).toBe(500);
      expect(mockGoalRepository.addDeposit).toHaveBeenCalled();
    });

    it('should throw error if deposit amount is not positive', async () => {
      mockGoalRepository.findById.mockResolvedValue({
        id: 'goal-123',
        userId: 'user-123',
        name: 'Test Goal',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(0),
        deadline: null,
        createdAt: new Date(),
      });

      expect(goalService.deposit('user-123', 'goal-123', 0)).rejects.toThrow(
        'Deposit amount must be positive'
      );
    });

    it('should throw error if goal not found', async () => {
      mockGoalRepository.findById.mockResolvedValue(null);

      expect(goalService.deposit('user-123', 'goal-123', 500)).rejects.toThrow('Goal not found');
    });
  });

  describe('delete', () => {
    it('should delete goal if found and owned by user', async () => {
      mockGoalRepository.findById.mockResolvedValue({
        id: 'goal-123',
        userId: 'user-123',
        name: 'Test Goal',
        targetAmount: new Decimal(1000),
        currentAmount: new Decimal(0),
        deadline: null,
        createdAt: new Date(),
      });
      mockGoalRepository.delete.mockResolvedValue();

      await goalService.delete('user-123', 'goal-123');

      expect(mockGoalRepository.delete).toHaveBeenCalledWith('goal-123');
    });

    it('should throw error if goal not found', async () => {
      mockGoalRepository.findById.mockResolvedValue(null);

      expect(goalService.delete('user-123', 'goal-123')).rejects.toThrow('Goal not found');
    });
  });
});
