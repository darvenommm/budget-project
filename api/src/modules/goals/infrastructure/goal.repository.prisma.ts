import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../../shared/database/index.js';
import { Goal, CreateGoalData, UpdateGoalData } from '../domain/goal.entity.js';
import { GoalRepository } from '../domain/goal.repository.js';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.js';

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
    return prisma.goal.create({ data });
  }

  @LatencyHistogram('db_goal')
  async update(id: string, data: UpdateGoalData): Promise<Goal> {
    return prisma.goal.update({ where: { id }, data });
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
