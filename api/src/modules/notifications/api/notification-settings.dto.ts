import { z } from 'zod';

export const updateNotificationSettingsSchema = z.object({
  telegramChatId: z.string().nullable().optional(),
  notifyLimitExceeded: z.boolean().optional(),
  notifyGoalReached: z.boolean().optional(),
});

export const linkTelegramSchema = z.object({
  chatId: z.string().min(1),
});

export type UpdateNotificationSettingsDto = z.infer<typeof updateNotificationSettingsSchema>;
export type LinkTelegramDto = z.infer<typeof linkTelegramSchema>;
