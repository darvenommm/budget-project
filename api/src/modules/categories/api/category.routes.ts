import { FastifyInstance } from 'fastify';
import { CategoryController } from './category.controller.js';
import { CategoryService } from '../application/category.service.js';
import { PrismaCategoryRepository } from '../infrastructure/category.repository.prisma.js';
import { authMiddleware } from '../../../shared/middleware/auth.js';

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  const categoryRepository = new PrismaCategoryRepository();
  const categoryService = new CategoryService(categoryRepository);
  const controller = new CategoryController(categoryService);

  app.get('/api/categories', { preHandler: authMiddleware }, controller.getAll.bind(controller));
  app.post('/api/categories', { preHandler: authMiddleware }, controller.create.bind(controller));
  app.put('/api/categories/:id', { preHandler: authMiddleware }, controller.update.bind(controller));
  app.delete('/api/categories/:id', { preHandler: authMiddleware }, controller.delete.bind(controller));
}

export { CategoryService } from '../application/category.service.js';
export { PrismaCategoryRepository } from '../infrastructure/category.repository.prisma.js';
