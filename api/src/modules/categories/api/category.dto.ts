import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(10).optional(),
});

export const categoryParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CategoryParamsDto = z.infer<typeof categoryParamsSchema>;
