import { prisma } from '../shared/database/index.js';
import type { UpdateSettingsDto, SettingsResponse } from './settings.dto.js';

export class SettingsService {
  async getOrCreate(userId: string): Promise<SettingsResponse> {
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  async update(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponse> {
    return prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });
  }

  async linkTelegram(userId: string, chatId: string): Promise<SettingsResponse> {
    return prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        telegramChatId: chatId,
      },
      update: {
        telegramChatId: chatId,
      },
    });
  }

  async unlinkTelegram(userId: string): Promise<SettingsResponse> {
    return prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        telegramChatId: null,
      },
      update: {
        telegramChatId: null,
      },
    });
  }
}
