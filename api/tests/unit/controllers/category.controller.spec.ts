import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CategoryController } from '../../../src/modules/categories/api/category.controller.ts';
import type { CategoryService } from '../../../src/modules/categories/application/category.service.ts';
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

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockService: {
    getAll: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  let mockReply: {
    status: ReturnType<typeof mock>;
    send: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockService = {
      getAll: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve()),
    };

    controller = new CategoryController(mockService as unknown as CategoryService);

    mockReply = {
      status: mock(function (this: typeof mockReply) {
        return this;
      }),
      send: mock(noop),
    };
  });

  describe('getAll', () => {
    it('should return all categories for user', async () => {
      const categories = [
        { id: 'cat-1', name: 'Food', icon: '🍔' },
        { id: 'cat-2', name: 'Transport', icon: '🚗' },
      ];
      mockService.getAll.mockImplementation(() => Promise.resolve(categories));

      const mockRequest = {
        user: { id: 'user-id' },
      } as unknown as FastifyRequest;

      await controller.getAll(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.getAll).toHaveBeenCalledWith('user-id');
      expect(mockReply.send).toHaveBeenCalledWith(categories);
    });

    it('should return empty array when no categories', async () => {
      mockService.getAll.mockImplementation(() => Promise.resolve([]));

      const mockRequest = {
        user: { id: 'user-id' },
      } as unknown as FastifyRequest;

      await controller.getAll(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });
  });

  describe('create', () => {
    it('should create category and return 201', async () => {
      const category = { id: 'cat-1', name: 'Food', icon: '🍔' };
      mockService.create.mockImplementation(() => Promise.resolve(category));

      const mockRequest = {
        user: { id: 'user-id' },
        body: { name: 'Food', icon: '🍔' },
      } as unknown as FastifyRequest;

      await controller.create(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalledWith('user-id', 'Food', '🍔');
      expect(mockReply.send).toHaveBeenCalledWith(category);
    });

    it('should throw ValidationError for missing name', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: { icon: '🍔' },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for empty name', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        body: { name: '', icon: '🍔' },
      } as unknown as FastifyRequest;

      await expectToReject(controller.create(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should create category without icon', async () => {
      const category = { id: 'cat-1', name: 'Food', icon: null };
      mockService.create.mockImplementation(() => Promise.resolve(category));

      const mockRequest = {
        user: { id: 'user-id' },
        body: { name: 'Food' },
      } as unknown as FastifyRequest;

      await controller.create(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockService.create).toHaveBeenCalledWith('user-id', 'Food', undefined);
    });
  });

  describe('update', () => {
    it('should update category', async () => {
      const category = { id: 'cat-1', name: 'Groceries', icon: '🛒' };
      mockService.update.mockImplementation(() => Promise.resolve(category));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Groceries', icon: '🛒' },
      } as unknown as FastifyRequest;

      await controller.update(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.update).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(category);
    });

    it('should throw ValidationError for invalid category id', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: 'invalid-uuid' },
        body: { name: 'Groceries' },
      } as unknown as FastifyRequest;

      await expectToReject(controller.update(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should update only name', async () => {
      const category = { id: 'cat-1', name: 'Groceries', icon: '🍔' };
      mockService.update.mockImplementation(() => Promise.resolve(category));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { name: 'Groceries' },
      } as unknown as FastifyRequest;

      await controller.update(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.update).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'Groceries' },
      );
    });

    it('should update only icon', async () => {
      const category = { id: 'cat-1', name: 'Food', icon: '🛒' };
      mockService.update.mockImplementation(() => Promise.resolve(category));

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { icon: '🛒' },
      } as unknown as FastifyRequest;

      await controller.update(mockRequest, mockReply as unknown as FastifyReply);

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

      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as unknown as FastifyRequest;

      await controller.delete(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockService.delete).toHaveBeenCalledWith(
        'user-id',
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });

    it('should throw ValidationError for invalid category id', async () => {
      const mockRequest = {
        user: { id: 'user-id' },
        params: { id: 'invalid-uuid' },
      } as unknown as FastifyRequest;

      await expectToReject(controller.delete(mockRequest, mockReply as unknown as FastifyReply));
    });
  });
});
