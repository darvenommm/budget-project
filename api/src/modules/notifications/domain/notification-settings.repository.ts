import {
  NotificationSettings,
  CreateNotificationSettingsData,
  UpdateNotificationSettingsData,
} from './notification-settings.entity.js';

export interface NotificationSettingsRepository {
  findByUserId(userId: string): Promise<NotificationSettings | null>;
  create(data: CreateNotificationSettingsData): Promise<NotificationSettings>;
  update(userId: string, data: UpdateNotificationSettingsData): Promise<NotificationSettings>;
  upsert(userId: string, data: UpdateNotificationSettingsData): Promise<NotificationSettings>;
}
