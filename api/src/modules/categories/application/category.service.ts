import type { CategoryRepository } from '../domain/category.repository.ts';
import type {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
} from '../domain/category.entity.ts';
import { DEFAULT_CATEGORIES } from '../domain/category.entity.ts';
import { logger } from '../../../shared/logger/index.ts';
import { NotFoundError, ConflictError } from '../../../shared/errors/index.ts';

export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async createDefaultCategories(userId: string): Promise<void> {
    const categories: CreateCategoryData[] = DEFAULT_CATEGORIES.map((cat) => ({
      userId,
      name: cat.name,
      icon: cat.icon,
      isDefault: true,
    }));

    await this.categoryRepository.createMany(categories);
    logger.info('Default categories created', { userId });
  }

  async getAll(userId: string): Promise<Category[]> {
    return this.categoryRepository.findByUserId(userId);
  }

  async create(userId: string, name: string, icon?: string): Promise<Category> {
    const existing = await this.categoryRepository.findByUserIdAndName(userId, name);
    if (existing) {
      throw new ConflictError('CATEGORY_ALREADY_EXISTS', 'Category already exists');
    }

    const category = await this.categoryRepository.create({
      userId,
      name,
      icon,
      isDefault: false,
    });

    logger.info('Category created', { categoryId: category.id, name });
    return category;
  }

  async update(userId: string, categoryId: string, data: UpdateCategoryData): Promise<Category> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    if (data.name) {
      const existing = await this.categoryRepository.findByUserIdAndName(userId, data.name);
      if (existing && existing.id !== categoryId) {
        throw new ConflictError('CATEGORY_NAME_EXISTS', 'Category with this name already exists');
      }
    }

    const updated = await this.categoryRepository.update(categoryId, data);
    logger.info('Category updated', { categoryId });
    return updated;
  }

  async delete(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    const hasTransactions = await this.categoryRepository.hasTransactions(categoryId);
    if (hasTransactions) {
      throw new ConflictError(
        'CATEGORY_HAS_TRANSACTIONS',
        'Cannot delete category with transactions',
      );
    }

    await this.categoryRepository.delete(categoryId);
    logger.info('Category deleted', { categoryId });
  }
}
