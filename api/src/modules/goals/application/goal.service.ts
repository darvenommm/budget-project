import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
import type { GoalRepository } from '../domain/goal.repository.ts';
import type { Goal, CreateGoalData, UpdateGoalData } from '../domain/goal.entity.ts';
import { publishEvent, createGoalDepositEvent } from '../../../shared/rabbitmq/index.ts';
import { logger } from '../../../shared/logger/index.ts';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.ts';

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  deadline?: string | undefined;
}

export interface UpdateGoalInput {
  name?: string | undefined;
  targetAmount?: number | undefined;
  deadline?: string | null | undefined;
}

export class GoalService {
  constructor(private goalRepository: GoalRepository) {}

  async getAll(userId: string): Promise<Goal[]> {
    return this.goalRepository.findByUserId(userId);
  }

  async getById(userId: string, goalId: string): Promise<Goal> {
    const goal = await this.goalRepository.findById(goalId);
    if (!goal || goal.userId !== userId) {
      throw new NotFoundError('GOAL_NOT_FOUND', 'Goal not found');
    }
    return goal;
  }

  async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    const data: CreateGoalData = {
      userId,
      name: input.name,
      targetAmount: new Decimal(input.targetAmount),
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    };

    const goal = await this.goalRepository.create(data);
    logger.info('Goal created', { goalId: goal.id, name: input.name });

    return goal;
  }

  async update(userId: string, goalId: string, input: UpdateGoalInput): Promise<Goal> {
    const existing = await this.goalRepository.findById(goalId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('GOAL_NOT_FOUND', 'Goal not found');
    }

    const data: UpdateGoalData = {
      name: input.name,
      targetAmount: input.targetAmount !== undefined ? new Decimal(input.targetAmount) : undefined,
      deadline:
        input.deadline === null ? null : input.deadline ? new Date(input.deadline) : undefined,
    };

    const goal = await this.goalRepository.update(goalId, data);
    logger.info('Goal updated', { goalId });

    return goal;
  }

  async delete(userId: string, goalId: string): Promise<void> {
    const goal = await this.goalRepository.findById(goalId);
    if (!goal || goal.userId !== userId) {
      throw new NotFoundError('GOAL_NOT_FOUND', 'Goal not found');
    }

    await this.goalRepository.delete(goalId);
    logger.info('Goal deleted', { goalId });
  }

  async deposit(userId: string, goalId: string, amount: number): Promise<Goal> {
    const existing = await this.goalRepository.findById(goalId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('GOAL_NOT_FOUND', 'Goal not found');
    }

    if (amount <= 0) {
      throw new ValidationError('INVALID_DEPOSIT_AMOUNT', 'Deposit amount must be positive');
    }

    const goal = await this.goalRepository.addDeposit(goalId, new Decimal(amount));
    logger.info('Deposit made to goal', { goalId, amount });

    const currentAmount = Number(goal.currentAmount);
    const targetAmount = Number(goal.targetAmount);

    if (currentAmount >= targetAmount) {
      const event = createGoalDepositEvent({
        userId,
        goalId,
        goalName: goal.name,
        currentAmount,
        targetAmount,
      });

      publishEvent(event);
      logger.info('Goal reached event published', { goalId, goalName: goal.name });
    }

    return goal;
  }
}
