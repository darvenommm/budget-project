import { CategoryRepository } from '../domain/category.repository.js';
import { Category, DEFAULT_CATEGORIES, CreateCategoryData, UpdateCategoryData } from '../domain/category.entity.js';
import { logger } from '../../../shared/logger/index.js';

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
      throw new Error('Category already exists');
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
      throw new Error('Category not found');
    }

    if (data.name) {
      const existing = await this.categoryRepository.findByUserIdAndName(userId, data.name);
      if (existing && existing.id !== categoryId) {
        throw new Error('Category with this name already exists');
      }
    }

    const updated = await this.categoryRepository.update(categoryId, data);
    logger.info('Category updated', { categoryId });
    return updated;
  }

  async delete(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new Error('Category not found');
    }

    const hasTransactions = await this.categoryRepository.hasTransactions(categoryId);
    if (hasTransactions) {
      throw new Error('Cannot delete category with transactions');
    }

    await this.categoryRepository.delete(categoryId);
    logger.info('Category deleted', { categoryId });
  }
}
