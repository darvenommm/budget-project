import type { Category, CreateCategoryData, UpdateCategoryData } from './category.entity.ts';

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findByUserId(userId: string): Promise<Category[]>;
  findByUserIdAndName(userId: string, name: string): Promise<Category | null>;
  create(data: CreateCategoryData): Promise<Category>;
  createMany(data: CreateCategoryData[]): Promise<void>;
  update(id: string, data: UpdateCategoryData): Promise<Category>;
  delete(id: string): Promise<void>;
  hasTransactions(categoryId: string): Promise<boolean>;
}
