import { prisma } from '../../../shared/database/index.js';
import {
  NotificationSettings,
  CreateNotificationSettingsData,
  UpdateNotificationSettingsData,
} from '../domain/notification-settings.entity.js';
import { NotificationSettingsRepository } from '../domain/notification-settings.repository.js';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.js';

export class PrismaNotificationSettingsRepository implements NotificationSettingsRepository {
  @LatencyHistogram('db_notification_settings')
  async findByUserId(userId: string): Promise<NotificationSettings | null> {
    return prisma.notificationSettings.findUnique({ where: { userId } });
  }

  @LatencyHistogram('db_notification_settings')
  async create(data: CreateNotificationSettingsData): Promise<NotificationSettings> {
    return prisma.notificationSettings.create({ data });
  }

  @LatencyHistogram('db_notification_settings')
  async update(userId: string, data: UpdateNotificationSettingsData): Promise<NotificationSettings> {
    return prisma.notificationSettings.update({ where: { userId }, data });
  }

  @LatencyHistogram('db_notification_settings')
  async upsert(userId: string, data: UpdateNotificationSettingsData): Promise<NotificationSettings> {
    return prisma.notificationSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        telegramChatId: data.telegramChatId ?? null,
        notifyLimitExceeded: data.notifyLimitExceeded ?? true,
        notifyGoalReached: data.notifyGoalReached ?? true,
      },
    });
  }
}
