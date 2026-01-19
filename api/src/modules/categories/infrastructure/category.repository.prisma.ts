import { prisma } from '../../../shared/database/index.ts';
import type {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
} from '../domain/category.entity.ts';
import type { CategoryRepository } from '../domain/category.repository.ts';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.ts';

export class PrismaCategoryRepository implements CategoryRepository {
  @LatencyHistogram('db_category')
  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  @LatencyHistogram('db_category')
  async findByUserId(userId: string): Promise<Category[]> {
    return prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }

  @LatencyHistogram('db_category')
  async findByUserIdAndName(userId: string, name: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { userId_name: { userId, name } } });
  }

  @LatencyHistogram('db_category')
  async create(data: CreateCategoryData): Promise<Category> {
    return prisma.category.create({
      data: {
        userId: data.userId,
        name: data.name,
        icon: data.icon ?? null,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  @LatencyHistogram('db_category')
  async createMany(data: CreateCategoryData[]): Promise<void> {
    await prisma.category.createMany({
      data: data.map((d) => ({
        userId: d.userId,
        name: d.name,
        icon: d.icon ?? null,
        isDefault: d.isDefault ?? false,
      })),
    });
  }

  @LatencyHistogram('db_category')
  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon ?? null }),
      },
    });
  }

  @LatencyHistogram('db_category')
  async delete(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }

  @LatencyHistogram('db_category')
  async hasTransactions(categoryId: string): Promise<boolean> {
    const count = await prisma.transaction.count({ where: { categoryId } });
    return count > 0;
  }
}
