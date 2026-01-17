export interface NotificationSettings {
  id: string;
  userId: string;
  telegramChatId: string | null;
  notifyLimitExceeded: boolean;
  notifyGoalReached: boolean;
}

export interface CreateNotificationSettingsData {
  userId: string;
  telegramChatId?: string;
  notifyLimitExceeded?: boolean;
  notifyGoalReached?: boolean;
}

export interface UpdateNotificationSettingsData {
  telegramChatId?: string | null;
  notifyLimitExceeded?: boolean;
  notifyGoalReached?: boolean;
}
