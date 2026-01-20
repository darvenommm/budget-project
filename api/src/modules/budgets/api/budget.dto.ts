import { z } from 'zod';

export const getBudgetQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

export const setLimitSchema = z.object({
  categoryId: z.uuid(),
  limitAmount: z.number().positive(),
});

export const removeLimitParamsSchema = z.object({
  categoryId: z.uuid(),
});

export const deleteBudgetParamsSchema = z.object({
  id: z.uuid(),
});

export type GetBudgetQuery = z.infer<typeof getBudgetQuerySchema>;
export type SetLimitDto = z.infer<typeof setLimitSchema>;
export type RemoveLimitParams = z.infer<typeof removeLimitParamsSchema>;
export type DeleteBudgetParams = z.infer<typeof deleteBudgetParamsSchema>;
