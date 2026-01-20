import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CategoryService } from '../../src/modules/categories/application/category.service.ts';
import type { CategoryRepository } from '../../src/modules/categories/domain/category.repository.ts';
import type { Category } from '../../src/modules/categories/domain/category.entity.ts';
import { NotFoundError, ConflictError } from '../../src/shared/errors/index.ts';

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

describe('CategoryService', () => {
  const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
    id: 'cat-123',
    userId: 'user-123',
    name: 'Food',
    icon: null,
    isDefault: false,
    ...overrides,
  });

  const findByIdMock = mock(() => Promise.resolve(null as Category | null));
  const findByUserIdMock = mock(() => Promise.resolve([] as Category[]));
  const findByUserIdAndNameMock = mock(() => Promise.resolve(null as Category | null));
  const createCategoryMock = mock(() => Promise.resolve(createMockCategory()));
  const createManyMock = mock(() => Promise.resolve());
  const updateCategoryMock = mock(() => Promise.resolve(createMockCategory()));
  const deleteCategoryMock = mock(() => Promise.resolve());
  const hasTransactionsMock = mock(() => Promise.resolve(false));

  const mockCategoryRepository: CategoryRepository = {
    findById: findByIdMock,
    findByUserId: findByUserIdMock,
    findByUserIdAndName: findByUserIdAndNameMock,
    create: createCategoryMock,
    createMany: createManyMock,
    update: updateCategoryMock,
    delete: deleteCategoryMock,
    hasTransactions: hasTransactionsMock,
  };

  let categoryService: CategoryService;

  beforeEach(() => {
    findByIdMock.mockReset();
    findByUserIdMock.mockReset();
    findByUserIdAndNameMock.mockReset();
    createCategoryMock.mockReset();
    createManyMock.mockReset();
    updateCategoryMock.mockReset();
    deleteCategoryMock.mockReset();
    hasTransactionsMock.mockReset();

    categoryService = new CategoryService(mockCategoryRepository);
  });

  describe('createDefaultCategories', () => {
    it('should create default categories for user', async () => {
      await categoryService.createDefaultCategories('user-123');

      expect(createManyMock).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all categories for user', async () => {
      const mockCategories = [
        createMockCategory({ id: 'cat-1', name: 'Food' }),
        createMockCategory({ id: 'cat-2', name: 'Transport' }),
      ];
      findByUserIdMock.mockResolvedValue(mockCategories);

      const result = await categoryService.getAll('user-123');

      expect(result).toHaveLength(2);
      expect(findByUserIdMock).toHaveBeenCalledWith('user-123');
    });
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const mockCategory = createMockCategory({ name: 'New Category' });
      findByUserIdAndNameMock.mockResolvedValue(null);
      createCategoryMock.mockResolvedValue(mockCategory);

      const result = await categoryService.create('user-123', 'New Category', 'icon');

      expect(result.name).toBe('New Category');
      expect(createCategoryMock).toHaveBeenCalled();
    });

    it('should throw ConflictError if category name already exists', async () => {
      findByUserIdAndNameMock.mockResolvedValue(createMockCategory());

      await expectToRejectWithError(
        categoryService.create('user-123', 'Food'),
        ConflictError,
      );
    });
  });

  describe('update', () => {
    it('should update an existing category', async () => {
      const mockCategory = createMockCategory();
      findByIdMock.mockResolvedValue(mockCategory);
      findByUserIdAndNameMock.mockResolvedValue(null);
      updateCategoryMock.mockResolvedValue({ ...mockCategory, name: 'Updated' });

      const result = await categoryService.update('user-123', 'cat-123', { name: 'Updated' });

      expect(updateCategoryMock).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundError if category not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        categoryService.update('user-123', 'cat-123', { name: 'Updated' }),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if category belongs to another user', async () => {
      findByIdMock.mockResolvedValue(createMockCategory({ userId: 'other-user' }));

      await expectToRejectWithError(
        categoryService.update('user-123', 'cat-123', { name: 'Updated' }),
        NotFoundError,
      );
    });

    it('should throw ConflictError if new name already exists for another category', async () => {
      findByIdMock.mockResolvedValue(createMockCategory({ id: 'cat-123' }));
      findByUserIdAndNameMock.mockResolvedValue(createMockCategory({ id: 'cat-456' }));

      await expectToRejectWithError(
        categoryService.update('user-123', 'cat-123', { name: 'Existing' }),
        ConflictError,
      );
    });

    it('should allow updating to the same name', async () => {
      const mockCategory = createMockCategory({ id: 'cat-123', name: 'Food' });
      findByIdMock.mockResolvedValue(mockCategory);
      findByUserIdAndNameMock.mockResolvedValue(mockCategory);
      updateCategoryMock.mockResolvedValue(mockCategory);

      const result = await categoryService.update('user-123', 'cat-123', { name: 'Food' });

      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete category if found and owned by user', async () => {
      findByIdMock.mockResolvedValue(createMockCategory());
      hasTransactionsMock.mockResolvedValue(false);

      await categoryService.delete('user-123', 'cat-123');

      expect(deleteCategoryMock).toHaveBeenCalledWith('cat-123');
    });

    it('should throw NotFoundError if category not found', async () => {
      findByIdMock.mockResolvedValue(null);

      await expectToRejectWithError(
        categoryService.delete('user-123', 'cat-123'),
        NotFoundError,
      );
    });

    it('should throw NotFoundError if category belongs to another user', async () => {
      findByIdMock.mockResolvedValue(createMockCategory({ userId: 'other-user' }));

      await expectToRejectWithError(
        categoryService.delete('user-123', 'cat-123'),
        NotFoundError,
      );
    });

    it('should throw ConflictError if category has transactions', async () => {
      findByIdMock.mockResolvedValue(createMockCategory());
      hasTransactionsMock.mockResolvedValue(true);

      await expectToRejectWithError(
        categoryService.delete('user-123', 'cat-123'),
        ConflictError,
      );
    });
  });
});
