import type { NotificationSettings as PrismaNotificationSettings } from '@prisma/client';

export type NotificationSettings = PrismaNotificationSettings;

export interface UpdateSettingsData {
  telegramChatId?: string | null;
  notifyLimitExceeded?: boolean;
  notifyGoalReached?: boolean;
}

export interface ISettingsRepository {
  findByUserId(userId: string): Promise<NotificationSettings | null>;
  create(userId: string): Promise<NotificationSettings>;
  update(userId: string, data: UpdateSettingsData): Promise<NotificationSettings>;
  upsert(userId: string, data: UpdateSettingsData): Promise<NotificationSettings>;
}
