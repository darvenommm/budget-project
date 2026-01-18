import { z } from 'zod';

export const updateSettingsSchema = z.object({
  notifyLimitExceeded: z.boolean().optional(),
  notifyGoalReached: z.boolean().optional(),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;

export const linkTelegramSchema = z.object({
  chatId: z.string().min(1),
});

export type LinkTelegramDto = z.infer<typeof linkTelegramSchema>;

export interface SettingsResponse {
  id: string;
  userId: string;
  telegramChatId: string | null;
  notifyLimitExceeded: boolean;
  notifyGoalReached: boolean;
}
