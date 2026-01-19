import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TransactionController } from '../../../src/modules/transactions/api/transaction.controller.ts';
import type { TransactionService } from '../../../src/modules/transactions/application/transaction.service.ts';
import { createMockRequest, createMockReply, expectToReject } from '../../helpers/mock-factories.ts';

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
  let mockReply: ReturnType<typeof createMockReply>;

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
    mockReply = createMockReply();
  });

  describe('create', () => {
    it('should return 400 for negative amount', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: {
          amount: -100,
          type: 'EXPENSE',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2026-01-18',
        },
      });

      await expectToReject(controller.create(mockRequest, mockReply));
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

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: transactionData,
      });

      await controller.create(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalled();
    });

    it('should throw ValidationError for missing categoryId', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: {
          amount: 100,
          type: 'EXPENSE',
          date: '2026-01-18',
        },
      });

      await expectToReject(controller.create(mockRequest, mockReply));
    });

    it('should throw ValidationError for invalid transaction type', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: {
          amount: 100,
          type: 'INVALID',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2026-01-18',
        },
      });

      await expectToReject(controller.create(mockRequest, mockReply));
    });
  });

  describe('getAll', () => {
    it('should return transactions for user', async () => {
      const transactions = [
        { id: 'tx-1', amount: 100, type: 'EXPENSE' },
        { id: 'tx-2', amount: 200, type: 'INCOME' },
      ];

      mockService.getAll.mockImplementation(() => Promise.resolve(transactions));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: {},
      });

      await controller.getAll(mockRequest, mockReply);

      expect(mockService.getAll).toHaveBeenCalledWith('user-id', {});
      expect(mockReply.send).toHaveBeenCalledWith(transactions);
    });

    it('should apply filters from query', async () => {
      mockService.getAll.mockImplementation(() => Promise.resolve([]));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { type: 'EXPENSE' },
      });

      await controller.getAll(mockRequest, mockReply);

      expect(mockService.getAll).toHaveBeenCalledWith('user-id', { type: 'EXPENSE' });
    });
  });

  describe('getById', () => {
    it('should return transaction by id', async () => {
      const transaction = { id: 'tx-id', amount: 100 };
      mockService.getById.mockImplementation(() => Promise.resolve(transaction));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });

      await controller.getById(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(transaction);
    });

    it('should throw ValidationError for invalid uuid', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: 'invalid-uuid' },
      });

      await expectToReject(controller.getById(mockRequest, mockReply));
    });
  });

  describe('update', () => {
    it('should update transaction', async () => {
      const updatedTransaction = { id: 'tx-id', amount: 150 };
      mockService.update.mockImplementation(() => Promise.resolve(updatedTransaction));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { amount: 150 },
      });

      await controller.update(mockRequest, mockReply);

      expect(mockService.update).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(updatedTransaction);
    });
  });

  describe('delete', () => {
    it('should delete transaction and return 204', async () => {
      mockService.delete.mockImplementation(() => Promise.resolve());

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });

      await controller.delete(mockRequest, mockReply);

      expect(mockService.delete).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });
  });
});
