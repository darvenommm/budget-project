import { NotificationSettingsRepository } from '../domain/notification-settings.repository.js';
import {
  NotificationSettings,
  UpdateNotificationSettingsData,
} from '../domain/notification-settings.entity.js';
import { logger } from '../../../shared/logger/index.js';

export interface UpdateSettingsInput {
  telegramChatId?: string | null;
  notifyLimitExceeded?: boolean;
  notifyGoalReached?: boolean;
}

export class NotificationSettingsService {
  constructor(private repository: NotificationSettingsRepository) {}

  async get(userId: string): Promise<NotificationSettings | null> {
    return this.repository.findByUserId(userId);
  }

  async getOrCreate(userId: string): Promise<NotificationSettings> {
    const existing = await this.repository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const settings = await this.repository.create({ userId });
    logger.info('Notification settings created', { userId });
    return settings;
  }

  async update(userId: string, input: UpdateSettingsInput): Promise<NotificationSettings> {
    const data: UpdateNotificationSettingsData = {};

    if (input.telegramChatId !== undefined) {
      data.telegramChatId = input.telegramChatId;
    }
    if (input.notifyLimitExceeded !== undefined) {
      data.notifyLimitExceeded = input.notifyLimitExceeded;
    }
    if (input.notifyGoalReached !== undefined) {
      data.notifyGoalReached = input.notifyGoalReached;
    }

    const settings = await this.repository.upsert(userId, data);
    logger.info('Notification settings updated', { userId });
    return settings;
  }

  async linkTelegram(userId: string, chatId: string): Promise<NotificationSettings> {
    const settings = await this.repository.upsert(userId, { telegramChatId: chatId });
    logger.info('Telegram linked', { userId, chatId });
    return settings;
  }

  async unlinkTelegram(userId: string): Promise<NotificationSettings> {
    const settings = await this.repository.upsert(userId, { telegramChatId: null });
    logger.info('Telegram unlinked', { userId });
    return settings;
  }
}
