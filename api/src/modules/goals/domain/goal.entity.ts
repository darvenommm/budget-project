import { Decimal } from '@prisma/client/runtime/library';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: Decimal;
  currentAmount: Decimal;
  deadline: Date | null;
  createdAt: Date;
}

export interface CreateGoalData {
  userId: string;
  name: string;
  targetAmount: Decimal;
  deadline?: Date;
}

export interface UpdateGoalData {
  name?: string;
  targetAmount?: Decimal;
  deadline?: Date | null;
}
