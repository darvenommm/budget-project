import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TransactionController } from '../../../src/modules/transactions/api/transaction.controller.ts';
import type { TransactionService } from '../../../src/modules/transactions/application/transaction.service.ts';
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

describe('TransactionController', () => {
  let controller: TransactionController;
  let mockService: {
    create: ReturnType<typeof mock>;
    getAll: ReturnType<typeof mock>;
    getById: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    getMonthlySpending: ReturnType<typeof mock>;
  };
  let mockReply: {
    status: ReturnType<typeof mock>;
    send: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockService = {
      create: mock(() => Promise.resolve({})),
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve()),
      getMonthlySpending: mock(() => Promise.resolve([])),
    };

    controller = new TransactionController(mockService as unknown as TransactionService);

    mockReply = {
      status: mock(function (this: typeof mockReply) {
        return this;
      }),
      send: mock(noop),
    };
  });

  describe('create', () => {
    it('should return 400 for negative amount', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: {
          amount: -100,
          type: 'EXPENSE',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2026-01-18',
        },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should return 201 for valid transaction', async () => {
      const transactionData = {
        amount: 100,
        type: 'EXPENSE',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        date: '2026-01-18',
      };

      mockService.create.mockImplementation(() =>
        Promise.resolve({ id: 'tx-id', ...transactionData }),
      );

      const mockRequest = {
        user: { id: 'user-id' },
        body: transactionData,
      } as unknown as FastifyRequest;

      await controller.create(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalled();
    });

    it('should throw ValidationError for missing categoryId', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: {
          amount: 100,
          type: 'EXPENSE',
          date: '2026-01-18',
        },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for invalid transaction type', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: {
          amount: 100,
          type: 'INVALID',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2026-01-18',
        },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });
  });

  describe('getAll', () => {
    it('should return transactions for user', async () => {
      const transactions = [
        { id: 'tx-1', amount: 100, type: 'EXPENSE' },
        { id: 'tx-2', amount: 200, type: 'INCOME' },
      ];

      mockService.getAll.mockImplementation(() => Promise.resolve(transactions));

      const mockRequest = {
        user: { id: 'user-id' },
        query: {},
      } as unknown as FastifyRequest;

      await controller.getAll(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.getAll).toHaveBeenCalledWith('user-id', {});
      expect(mockReply.send).toHaveBeenCalledWith(transactions);
    });

    it('should apply filters from query', async () => {
      mockService.getAll.mockImplementation(() => Promise.resolve([]));

      const mockRequest = {
        user: { id: 'user-id' },
        query: { type: 'EXPENSE' },
      } as unknown as FastifyRequest;

      await controller.getAll(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.getAll).toHaveBeenCalledWith('user-id', { type: 'EXPENSE' });
    });
  });

  describe('getById', () => {
    it('should return transaction by id', async () => {
      const transaction = { id: 'tx-id', amount: 100 };
      mockService.getById.mockImplementation(() => Promise.resolve(transaction));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as unknown as FastifyRequest;

      await controller.getById(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.send).toHaveBeenCalledWith(transaction);
    });

    it('should throw ValidationError for invalid uuid', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: 'invalid-uuid' },
      } as unknown as FastifyRequest;

      await expectToReject(controller.getById(mockRequest, mockReply as unknown as FastifyReply));
    });
  });

  describe('update', () => {
    it('should update transaction', async () => {
      const updatedTransaction = { id: 'tx-id', amount: 150 };
      mockService.update.mockImplementation(() => Promise.resolve(updatedTransaction));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { amount: 150 },
      } as unknown as FastifyRequest;

      await controller.update(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.update).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(updatedTransaction);
    });
  });

  describe('delete', () => {
    it('should delete transaction and return 204', async () => {
      mockService.delete.mockImplementation(() => Promise.resolve());

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as unknown as FastifyRequest;

      await controller.delete(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.delete).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });
  });
});
