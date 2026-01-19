import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { BudgetController } from '../../../src/modules/budgets/api/budget.controller.ts';
import type { BudgetService } from '../../../src/modules/budgets/application/budget.service.ts';
import {
  createMockRequest,
  createMockReply,
  expectToReject,
} from '../../helpers/mock-factories.ts';

describe('BudgetController', () => {
  let controller: BudgetController;
  let mockService: {
    getBudget: ReturnType<typeof mock>;
    getOrCreateBudget: ReturnType<typeof mock>;
    getAllBudgets: ReturnType<typeof mock>;
    setLimit: ReturnType<typeof mock>;
    removeLimit: ReturnType<typeof mock>;
    deleteBudget: ReturnType<typeof mock>;
  };
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockService = {
      getBudget: mock(() => Promise.resolve(null)),
      getOrCreateBudget: mock(() => Promise.resolve({})),
      getAllBudgets: mock(() => Promise.resolve([])),
      setLimit: mock(() => Promise.resolve({})),
      removeLimit: mock(() => Promise.resolve()),
      deleteBudget: mock(() => Promise.resolve()),
    };

    controller = new BudgetController(mockService as unknown as BudgetService);
    mockReply = createMockReply();
  });

  describe('getBudget', () => {
    it('should return budget for valid query', async () => {
      const budget = { id: 'budget-1', month: 1, year: 2026, limits: [] };
      mockService.getBudget.mockImplementation(() => Promise.resolve(budget));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1', year: '2026' },
      });

      await controller.getBudget(mockRequest, mockReply);

      expect(mockService.getBudget).toHaveBeenCalledWith('user-id', 1, 2026);
      expect(mockReply.send).toHaveBeenCalledWith(budget);
    });

    it('should throw NotFoundError when budget does not exist', async () => {
      mockService.getBudget.mockImplementation(() => Promise.resolve(null));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1', year: '2026' },
      });

      await expectToReject(controller.getBudget(mockRequest, mockReply));
    });

    it('should throw ValidationError for invalid month', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '13', year: '2026' },
      });

      await expectToReject(controller.getBudget(mockRequest, mockReply));
    });

    it('should throw ValidationError for missing year', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1' },
      });

      await expectToReject(controller.getBudget(mockRequest, mockReply));
    });
  });

  describe('getOrCreateBudget', () => {
    it('should return existing or new budget', async () => {
      const budget = { id: 'budget-1', month: 1, year: 2026, limits: [] };
      mockService.getOrCreateBudget.mockImplementation(() => Promise.resolve(budget));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1', year: '2026' },
      });

      await controller.getOrCreateBudget(mockRequest, mockReply);

      expect(mockService.getOrCreateBudget).toHaveBeenCalledWith('user-id', 1, 2026);
      expect(mockReply.send).toHaveBeenCalledWith(budget);
    });
  });

  describe('getAllBudgets', () => {
    it('should return all budgets for user', async () => {
      const budgets = [
        { id: 'budget-1', month: 1, year: 2026 },
        { id: 'budget-2', month: 2, year: 2026 },
      ];
      mockService.getAllBudgets.mockImplementation(() => Promise.resolve(budgets));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
      });

      await controller.getAllBudgets(mockRequest, mockReply);

      expect(mockService.getAllBudgets).toHaveBeenCalledWith('user-id');
      expect(mockReply.send).toHaveBeenCalledWith(budgets);
    });
  });

  describe('setLimit', () => {
    it('should create limit and return 201', async () => {
      const limit = { id: 'limit-1', categoryId: 'cat-1', limitAmount: 500 };
      mockService.setLimit.mockImplementation(() => Promise.resolve(limit));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1', year: '2026' },
        body: { categoryId: '550e8400-e29b-41d4-a716-446655440000', limitAmount: 500 },
      });

      await controller.setLimit(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.setLimit).toHaveBeenCalled();
    });

    it('should throw ValidationError for negative limit amount', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1', year: '2026' },
        body: { categoryId: '550e8400-e29b-41d4-a716-446655440000', limitAmount: -100 },
      });

      await expectToReject(controller.setLimit(mockRequest, mockReply));
    });

    it('should throw ValidationError for invalid categoryId', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1', year: '2026' },
        body: { categoryId: 'invalid-uuid', limitAmount: 500 },
      });

      await expectToReject(controller.setLimit(mockRequest, mockReply));
    });
  });

  describe('removeLimit', () => {
    it('should remove limit and return 204', async () => {
      mockService.removeLimit.mockImplementation(() => Promise.resolve());

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        query: { month: '1', year: '2026' },
        params: { categoryId: '550e8400-e29b-41d4-a716-446655440000' },
      });

      await controller.removeLimit(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockService.removeLimit).toHaveBeenCalled();
    });
  });

  describe('deleteBudget', () => {
    it('should delete budget and return 204', async () => {
      mockService.deleteBudget.mockImplementation(() => Promise.resolve());

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });

      await controller.deleteBudget(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockService.deleteBudget).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid budget id', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: 'invalid-uuid' },
      });

      await expectToReject(controller.deleteBudget(mockRequest, mockReply));
    });
  });
});
