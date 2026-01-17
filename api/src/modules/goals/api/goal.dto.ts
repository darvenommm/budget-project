import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  deadline: z.string().date().optional(),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  deadline: z.string().date().nullable().optional(),
});

export const depositSchema = z.object({
  amount: z.number().positive(),
});

export type CreateGoalDto = z.infer<typeof createGoalSchema>;
export type UpdateGoalDto = z.infer<typeof updateGoalSchema>;
export type DepositDto = z.infer<typeof depositSchema>;
