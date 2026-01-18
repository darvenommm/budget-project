import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;
import { Goal, CreateGoalData, UpdateGoalData } from './goal.entity.js';

export interface GoalRepository {
  findById(id: string): Promise<Goal | null>;
  findByUserId(userId: string): Promise<Goal[]>;
  create(data: CreateGoalData): Promise<Goal>;
  update(id: string, data: UpdateGoalData): Promise<Goal>;
  delete(id: string): Promise<void>;
  addDeposit(id: string, amount: Decimal): Promise<Goal>;
}
