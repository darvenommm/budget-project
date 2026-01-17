import { FastifyRequest, FastifyReply } from 'fastify';
import { CategoryService } from '../application/category.service.js';
import { createCategorySchema, updateCategorySchema } from './category.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const categories = await this.categoryService.getAll(userId);
    reply.send(categories);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = createCategorySchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const category = await this.categoryService.create(userId, result.data.name, result.data.icon);
      reply.status(201).send(category);
    } catch (error) {
      if (error instanceof Error && error.message === 'Category already exists') {
        reply.status(409).send({ error: error.message });
        return;
      }
      logger.error('Failed to create category', { error });
      reply.status(500).send({ error: 'Failed to create category' });
    }
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const categoryId = request.params.id;
    const result = updateCategorySchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const category = await this.categoryService.update(userId, categoryId, result.data);
      reply.send(category);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
        if (error.message === 'Category with this name already exists') {
          reply.status(409).send({ error: error.message });
          return;
        }
      }
      logger.error('Failed to update category', { error });
      reply.status(500).send({ error: 'Failed to update category' });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const categoryId = request.params.id;

    try {
      await this.categoryService.delete(userId, categoryId);
      reply.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
        if (error.message === 'Cannot delete category with transactions') {
          reply.status(409).send({ error: error.message });
          return;
        }
      }
      logger.error('Failed to delete category', { error });
      reply.status(500).send({ error: 'Failed to delete category' });
    }
  }
}
