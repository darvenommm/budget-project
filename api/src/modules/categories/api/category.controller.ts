import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CategoryService } from '../application/category.service.ts';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
} from './category.dto.ts';
import { ValidationError } from '../../../shared/errors/index.ts';
import { getAuthenticatedUser } from '../../../shared/middleware/auth.ts';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const categories = await this.categoryService.getAll(userId);
    return reply.send(categories);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const result = createCategorySchema.safeParse(request.body);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const category = await this.categoryService.create(userId, result.data.name, result.data.icon);
    return reply.status(201).send(category);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const paramsResult = categoryParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        paramsResult.error.flatten(),
      );
    }

    const categoryId = paramsResult.data.id;
    const result = updateCategorySchema.safeParse(request.body);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const category = await this.categoryService.update(userId, categoryId, result.data);
    return reply.send(category);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const paramsResult = categoryParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        paramsResult.error.flatten(),
      );
    }

    const categoryId = paramsResult.data.id;
    await this.categoryService.delete(userId, categoryId);
    return reply.status(204).send();
  }
}
