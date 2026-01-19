import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GoalService } from '../application/goal.service.ts';
import { createGoalSchema, updateGoalSchema, depositSchema } from './goal.dto.ts';
import { ValidationError } from '../../../shared/errors/index.ts';
import { getAuthenticatedUser } from '../../../shared/middleware/auth.ts';

export class GoalController {
  constructor(private goalService: GoalService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const goals = await this.goalService.getAll(userId);
    return reply.send(goals);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const goalId = request.params.id;

    const goal = await this.goalService.getById(userId, goalId);
    return reply.send(goal);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const result = createGoalSchema.safeParse(request.body);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const goal = await this.goalService.create(userId, result.data);
    return reply.status(201).send(goal);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const goalId = request.params.id;
    const result = updateGoalSchema.safeParse(request.body);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const goal = await this.goalService.update(userId, goalId, result.data);
    return reply.send(goal);
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const goalId = request.params.id;

    await this.goalService.delete(userId, goalId);
    return reply.status(204).send();
  }

  async deposit(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const goalId = request.params.id;
    const result = depositSchema.safeParse(request.body);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', result.error.flatten());
    }

    const goal = await this.goalService.deposit(userId, goalId, result.data.amount);
    return reply.send(goal);
  }
}
