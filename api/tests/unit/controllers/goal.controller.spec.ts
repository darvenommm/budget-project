import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { GoalController } from '../../../src/modules/goals/api/goal.controller.ts';
import type { GoalService } from '../../../src/modules/goals/application/goal.service.ts';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Helper for testing async rejections (Bun test types don't properly type expect().rejects as Promise)
async function expectToReject(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected promise to reject but it resolved') {
      throw error;
    }
  }
}

const noop = (): void => {
  // intentionally empty
};

describe('GoalController', () => {
  let controller: GoalController;
  let mockService: {
    getAll: ReturnType<typeof mock>;
    getById: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    deposit: ReturnType<typeof mock>;
  };
  let mockReply: {
    status: ReturnType<typeof mock>;
    send: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockService = {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve({})),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve()),
      deposit: mock(() => Promise.resolve({})),
    };

    controller = new GoalController(mockService as unknown as GoalService);

    mockReply = {
      status: mock(function (this: typeof mockReply) {
        return this;
      }),
      send: mock(noop),
    };
  });

  describe('getAll', () => {
    it('should return all goals for user', async () => {
      const goals = [
        { id: 'goal-1', name: 'Vacation', targetAmount: 5000, currentAmount: 1000 },
        { id: 'goal-2', name: 'Emergency Fund', targetAmount: 10000, currentAmount: 3000 },
      ];
      mockService.getAll.mockImplementation(() => Promise.resolve(goals));

      const mockRequest = {
        user: { id: 'user-id' },
      } as unknown as FastifyRequest;

      await controller.getAll(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.getAll).toHaveBeenCalledWith('user-id');
      expect(mockReply.send).toHaveBeenCalledWith(goals);
    });

    it('should return empty array when no goals', async () => {
      mockService.getAll.mockImplementation(() => Promise.resolve([]));

      const mockRequest = {
        user: { id: 'user-id' },
      } as unknown as FastifyRequest;

      await controller.getAll(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });
  });

  describe('getById', () => {
    it('should return goal by id', async () => {
      const goal = { id: 'goal-1', name: 'Vacation', targetAmount: 5000, currentAmount: 1000 };
      mockService.getById.mockImplementation(() => Promise.resolve(goal));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await controller.getById(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.getById).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(mockReply.send).toHaveBeenCalledWith(goal);
    });
  });

  describe('create', () => {
    it('should create goal and return 201', async () => {
      const goal = { id: 'goal-1', name: 'Vacation', targetAmount: 5000, currentAmount: 0 };
      mockService.create.mockImplementation(() => Promise.resolve(goal));

      const mockRequest = {
        user: { id: 'user-id' },
        body: { name: 'Vacation', targetAmount: 5000 },
      } as unknown as FastifyRequest;

      await controller.create(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalledWith('user-id', {
        name: 'Vacation',
        targetAmount: 5000,
      });
      expect(mockReply.send).toHaveBeenCalledWith(goal);
    });

    it('should create goal with deadline', async () => {
      const goal = {
        id: 'goal-1',
        name: 'Vacation',
        targetAmount: 5000,
        currentAmount: 0,
        deadline: '2026-12-31',
      };
      mockService.create.mockImplementation(() => Promise.resolve(goal));

      const mockRequest = {
        user: { id: 'user-id' },
        body: { name: 'Vacation', targetAmount: 5000, deadline: '2026-12-31' },
      } as unknown as FastifyRequest;

      await controller.create(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalledWith('user-id', {
        name: 'Vacation',
        targetAmount: 5000,
        deadline: '2026-12-31',
      });
    });

    it('should throw ValidationError for missing name', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: { targetAmount: 5000 },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for missing targetAmount', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: { name: 'Vacation' },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for negative targetAmount', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: { name: 'Vacation', targetAmount: -1000 },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });
  });

  describe('update', () => {
    it('should update goal', async () => {
      const goal = { id: 'goal-1', name: 'Trip to Japan', targetAmount: 7000 };
      mockService.update.mockImplementation(() => Promise.resolve(goal));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Trip to Japan', targetAmount: 7000 },
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await controller.update(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.update).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'Trip to Japan', targetAmount: 7000 },
      );
      expect(mockReply.send).toHaveBeenCalledWith(goal);
    });

    it('should update only name', async () => {
      const goal = { id: 'goal-1', name: 'Trip to Japan', targetAmount: 5000 };
      mockService.update.mockImplementation(() => Promise.resolve(goal));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Trip to Japan' },
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await controller.update(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.update).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'Trip to Japan' },
      );
    });

    it('should allow empty update body (no-op update)', async () => {
      const goal = { id: 'goal-1', name: 'Vacation', targetAmount: 5000 };
      mockService.update.mockImplementation(() => Promise.resolve(goal));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {},
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await controller.update(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.update).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
        {},
      );
    });
  });

  describe('delete', () => {
    it('should delete goal and return 204', async () => {
      mockService.delete.mockImplementation(() => Promise.resolve());

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await controller.delete(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockService.delete).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });
  });

  describe('deposit', () => {
    it('should make deposit to goal', async () => {
      const goal = { id: 'goal-1', name: 'Vacation', targetAmount: 5000, currentAmount: 1500 };
      mockService.deposit.mockImplementation(() => Promise.resolve(goal));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { amount: 500 },
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await controller.deposit(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.deposit).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
        500,
      );
      expect(mockReply.send).toHaveBeenCalledWith(goal);
    });

    it('should throw ValidationError for missing amount', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {},
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await expectToReject(controller.deposit(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for negative amount', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { amount: -100 },
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await expectToReject(controller.deposit(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for zero amount', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { amount: 0 },
      } as unknown as FastifyRequest<{ Params: { id: string } }>;

      await expectToReject(controller.deposit(mockRequest, mockReply as unknown as FastifyReply));
    });
  });
});
