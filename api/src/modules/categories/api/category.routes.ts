import type { FastifyInstance } from 'fastify';
import { CategoryController } from './category.controller.ts';
import { CategoryService } from '../application/category.service.ts';
import { PrismaCategoryRepository } from '../infrastructure/category.repository.prisma.ts';
import { authMiddleware } from '../../../shared/middleware/auth.ts';

export function categoryRoutes(app: FastifyInstance): void {
  const categoryRepository = new PrismaCategoryRepository();
  const categoryService = new CategoryService(categoryRepository);
  const controller = new CategoryController(categoryService);

  app.get(
    '/api/categories',
    { preHandler: authMiddleware as never },
    controller.getAll.bind(controller),
  );
  app.post(
    '/api/categories',
    { preHandler: authMiddleware as never },
    controller.create.bind(controller),
  );
  app.put(
    '/api/categories/:id',
    { preHandler: authMiddleware as never },
    controller.update.bind(controller),
  );
  app.delete(
    '/api/categories/:id',
    { preHandler: authMiddleware as never },
    controller.delete.bind(controller),
  );
}

export { CategoryService } from '../application/category.service.ts';
export { PrismaCategoryRepository } from '../infrastructure/category.repository.prisma.ts';
