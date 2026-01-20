import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { BudgetService } from '../application/budget.service.ts';
import {
  getBudgetQuerySchema,
  setLimitSchema,
  removeLimitParamsSchema,
  deleteBudgetParamsSchema,
} from './budget.dto.ts';
import { ValidationError, NotFoundError } from '../../../shared/errors/index.ts';
import { getAuthenticatedUser } from '../../../shared/middleware/auth.ts';

export class BudgetController {
  constructor(private budgetService: BudgetService) {}

  async getBudget(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const result = getBudgetQuerySchema.safeParse(request.query);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', z.treeifyError(result.error));
    }

    const budget = await this.budgetService.getBudget(userId, result.data.month, result.data.year);

    if (!budget) {
      throw new NotFoundError('BUDGET_NOT_FOUND', 'Budget not found');
    }

    return reply.send(budget);
  }

  async getOrCreateBudget(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const result = getBudgetQuerySchema.safeParse(request.query);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', z.treeifyError(result.error));
    }

    const budget = await this.budgetService.getOrCreateBudget(
      userId,
      result.data.month,
      result.data.year,
    );

    return reply.send(budget);
  }

  async getAllBudgets(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const budgets = await this.budgetService.getAllBudgets(userId);
    return reply.send(budgets);
  }

  async setLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const queryResult = getBudgetQuerySchema.safeParse(request.query);
    const bodyResult = setLimitSchema.safeParse(request.body);

    if (!queryResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(queryResult.error),
      );
    }

    if (!bodyResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(bodyResult.error),
      );
    }

    const limit = await this.budgetService.setLimit(
      userId,
      queryResult.data.month,
      queryResult.data.year,
      bodyResult.data,
    );
    return reply.status(201).send(limit);
  }

  async removeLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const queryResult = getBudgetQuerySchema.safeParse(request.query);
    const paramsResult = removeLimitParamsSchema.safeParse(request.params);

    if (!queryResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(queryResult.error),
      );
    }

    if (!paramsResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(paramsResult.error),
      );
    }

    await this.budgetService.removeLimit(
      userId,
      queryResult.data.month,
      queryResult.data.year,
      paramsResult.data.categoryId,
    );
    return reply.status(204).send();
  }

  async deleteBudget(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const paramsResult = deleteBudgetParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(paramsResult.error),
      );
    }

    await this.budgetService.deleteBudget(userId, paramsResult.data.id);
    return reply.status(204).send();
  }
}
