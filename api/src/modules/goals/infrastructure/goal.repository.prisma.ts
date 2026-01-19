import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;
import { prisma } from '../../../shared/database/index.ts';
import type { Goal, CreateGoalData, UpdateGoalData } from '../domain/goal.entity.ts';
import { GoalRepository } from '../domain/goal.repository.ts';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.ts';

export class PrismaGoalRepository implements GoalRepository {
  @LatencyHistogram('db_goal')
  async findById(id: string): Promise<Goal | null> {
    return prisma.goal.findUnique({ where: { id } });
  }

  @LatencyHistogram('db_goal')
  async findByUserId(userId: string): Promise<Goal[]> {
    return prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @LatencyHistogram('db_goal')
  async create(data: CreateGoalData): Promise<Goal> {
    return prisma.goal.create({
      data: {
        ...data,
        deadline: data.deadline ?? null,
      },
    });
  }

  @LatencyHistogram('db_goal')
  async update(id: string, data: UpdateGoalData): Promise<Goal> {
    return prisma.goal.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
        ...(data.deadline !== undefined && { deadline: data.deadline }),
      },
    });
  }

  @LatencyHistogram('db_goal')
  async delete(id: string): Promise<void> {
    await prisma.goal.delete({ where: { id } });
  }

  @LatencyHistogram('db_goal')
  async addDeposit(id: string, amount: Decimal): Promise<Goal> {
    return prisma.goal.update({
      where: { id },
      data: {
        currentAmount: {
          increment: amount,
        },
      },
    });
  }
}
