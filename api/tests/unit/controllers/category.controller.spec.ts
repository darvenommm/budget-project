import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CategoryController } from '../../../src/modules/categories/api/category.controller.ts';
import type { CategoryService } from '../../../src/modules/categories/application/category.service.ts';
import { createMockRequest, createMockReply, expectToReject } from '../../helpers/mock-factories.ts';

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockService: {
    getAll: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockService = {
      getAll: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve()),
    };

    controller = new CategoryController(mockService as unknown as CategoryService);
    mockReply = createMockReply();
  });

  describe('getAll', () => {
    it('should return all categories for user', async () => {
      const categories = [
        { id: 'cat-1', name: 'Food', icon: '🍔' },
        { id: 'cat-2', name: 'Transport', icon: '🚗' },
      ];
      mockService.getAll.mockImplementation(() => Promise.resolve(categories));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
      });

      await controller.getAll(mockRequest, mockReply);

      expect(mockService.getAll).toHaveBeenCalledWith('user-id');
      expect(mockReply.send).toHaveBeenCalledWith(categories);
    });

    it('should return empty array when no categories', async () => {
      mockService.getAll.mockImplementation(() => Promise.resolve([]));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
      });

      await controller.getAll(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });
  });

  describe('create', () => {
    it('should create category and return 201', async () => {
      const category = { id: 'cat-1', name: 'Food', icon: '🍔' };
      mockService.create.mockImplementation(() => Promise.resolve(category));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: { name: 'Food', icon: '🍔' },
      });

      await controller.create(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalledWith('user-id', 'Food', '🍔');
      expect(mockReply.send).toHaveBeenCalledWith(category);
    });

    it('should throw ValidationError for missing name', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: { icon: '🍔' },
      });

      await expectToReject(controller.create(mockRequest, mockReply));
    });

    it('should throw ValidationError for empty name', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: { name: '', icon: '🍔' },
      });

      await expectToReject(controller.create(mockRequest, mockReply));
    });

    it('should create category without icon', async () => {
      const category = { id: 'cat-1', name: 'Food', icon: null };
      mockService.create.mockImplementation(() => Promise.resolve(category));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        body: { name: 'Food' },
      });

      await controller.create(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalledWith('user-id', 'Food', undefined);
    });
  });

  describe('update', () => {
    it('should update category', async () => {
      const category = { id: 'cat-1', name: 'Groceries', icon: '🛒' };
      mockService.update.mockImplementation(() => Promise.resolve(category));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Groceries', icon: '🛒' },
      });

      await controller.update(mockRequest, mockReply);

      expect(mockService.update).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(category);
    });

    it('should throw ValidationError for invalid category id', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: 'invalid-uuid' },
        body: { name: 'Groceries' },
      });

      await expectToReject(controller.update(mockRequest, mockReply));
    });

    it('should update only name', async () => {
      const category = { id: 'cat-1', name: 'Groceries', icon: '🍔' };
      mockService.update.mockImplementation(() => Promise.resolve(category));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Groceries' },
      });

      await controller.update(mockRequest, mockReply);

      expect(mockService.update).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'Groceries' },
      );
    });

    it('should update only icon', async () => {
      const category = { id: 'cat-1', name: 'Food', icon: '🛒' };
      mockService.update.mockImplementation(() => Promise.resolve(category));

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { icon: '🛒' },
      });

      await controller.update(mockRequest, mockReply);

      expect(mockService.update).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
        { icon: '🛒' },
      );
    });
  });

  describe('delete', () => {
    it('should delete category and return 204', async () => {
      mockService.delete.mockImplementation(() => Promise.resolve());

      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });

      await controller.delete(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockService.delete).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });

    it('should throw ValidationError for invalid category id', async () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id' },
        params: { id: 'invalid-uuid' },
      });

      await expectToReject(controller.delete(mockRequest, mockReply));
    });
  });
});
