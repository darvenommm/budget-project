import type { Prisma } from '@prisma/client';
import { prisma } from '../shared/database/index.ts';
import type { UpdateSettingsDto, SettingsResponse } from './settings.dto.ts';

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
    // Build create/update data explicitly to satisfy exactOptionalPropertyTypes
    const createData: Prisma.NotificationSettingsUncheckedCreateInput = { userId };
    const updateData: Prisma.NotificationSettingsUpdateInput = {};

    if (dto.notifyLimitExceeded !== undefined) {
      createData.notifyLimitExceeded = dto.notifyLimitExceeded;
      updateData.notifyLimitExceeded = dto.notifyLimitExceeded;
    }
    if (dto.notifyGoalReached !== undefined) {
      createData.notifyGoalReached = dto.notifyGoalReached;
      updateData.notifyGoalReached = dto.notifyGoalReached;
    }

    return prisma.notificationSettings.upsert({
      where: { userId },
      create: createData,
      update: updateData,
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
