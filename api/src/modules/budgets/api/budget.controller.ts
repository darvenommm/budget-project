import { FastifyRequest, FastifyReply } from 'fastify';
import { BudgetService } from '../application/budget.service.js';
import {
  getBudgetQuerySchema,
  setLimitSchema,
  removeLimitParamsSchema,
  deleteBudgetParamsSchema,
} from './budget.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class BudgetController {
  constructor(private budgetService: BudgetService) {}

  async getBudget(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = getBudgetQuerySchema.safeParse(request.query);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    const budget = await this.budgetService.getBudget(userId, result.data.month, result.data.year);

    if (!budget) {
      reply.status(404).send({ error: 'Budget not found' });
      return;
    }

    reply.send(budget);
  }

  async getOrCreateBudget(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = getBudgetQuerySchema.safeParse(request.query);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    const budget = await this.budgetService.getOrCreateBudget(
      userId,
      result.data.month,
      result.data.year
    );

    reply.send(budget);
  }

  async getAllBudgets(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const budgets = await this.budgetService.getAllBudgets(userId);
    reply.send(budgets);
  }

  async setLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const queryResult = getBudgetQuerySchema.safeParse(request.query);
    const bodyResult = setLimitSchema.safeParse(request.body);

    if (!queryResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: queryResult.error.flatten() });
      return;
    }

    if (!bodyResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: bodyResult.error.flatten() });
      return;
    }

    try {
      const limit = await this.budgetService.setLimit(
        userId,
        queryResult.data.month,
        queryResult.data.year,
        bodyResult.data
      );
      reply.status(201).send(limit);
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to set budget limit', { error });
      reply.status(500).send({ error: 'Failed to set budget limit' });
    }
  }

  async removeLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const queryResult = getBudgetQuerySchema.safeParse(request.query);
    const paramsResult = removeLimitParamsSchema.safeParse(request.params);

    if (!queryResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: queryResult.error.flatten() });
      return;
    }

    if (!paramsResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: paramsResult.error.flatten() });
      return;
    }

    try {
      await this.budgetService.removeLimit(
        userId,
        queryResult.data.month,
        queryResult.data.year,
        paramsResult.data.categoryId
      );
      reply.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Budget not found' || error.message === 'Limit not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
      }
      logger.error('Failed to remove budget limit', { error });
      reply.status(500).send({ error: 'Failed to remove budget limit' });
    }
  }

  async deleteBudget(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const paramsResult = deleteBudgetParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: paramsResult.error.flatten() });
      return;
    }

    try {
      await this.budgetService.deleteBudget(userId, paramsResult.data.id);
      reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Budget not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to delete budget', { error });
      reply.status(500).send({ error: 'Failed to delete budget' });
    }
  }
}
