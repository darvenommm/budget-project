import { FastifyRequest, FastifyReply } from 'fastify';
import { GoalService } from '../application/goal.service.js';
import { createGoalSchema, updateGoalSchema, depositSchema } from './goal.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class GoalController {
  constructor(private goalService: GoalService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const goals = await this.goalService.getAll(userId);
    reply.send(goals);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const goalId = request.params.id;

    try {
      const goal = await this.goalService.getById(userId, goalId);
      reply.send(goal);
    } catch (error) {
      if (error instanceof Error && error.message === 'Goal not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to get goal', { error });
      reply.status(500).send({ error: 'Failed to get goal' });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = createGoalSchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const goal = await this.goalService.create(userId, result.data);
      reply.status(201).send(goal);
    } catch (error) {
      logger.error('Failed to create goal', { error });
      reply.status(500).send({ error: 'Failed to create goal' });
    }
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const goalId = request.params.id;
    const result = updateGoalSchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const goal = await this.goalService.update(userId, goalId, result.data);
      reply.send(goal);
    } catch (error) {
      if (error instanceof Error && error.message === 'Goal not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to update goal', { error });
      reply.status(500).send({ error: 'Failed to update goal' });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const goalId = request.params.id;

    try {
      await this.goalService.delete(userId, goalId);
      reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Goal not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to delete goal', { error });
      reply.status(500).send({ error: 'Failed to delete goal' });
    }
  }

  async deposit(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const goalId = request.params.id;
    const result = depositSchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const goal = await this.goalService.deposit(userId, goalId, result.data.amount);
      reply.send(goal);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Goal not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
        if (error.message === 'Deposit amount must be positive') {
          reply.status(400).send({ error: error.message });
          return;
        }
      }
      logger.error('Failed to deposit to goal', { error });
      reply.status(500).send({ error: 'Failed to deposit to goal' });
    }
  }
}
