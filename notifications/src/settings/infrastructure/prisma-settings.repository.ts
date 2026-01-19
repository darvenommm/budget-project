import { prisma } from '../../shared/database/index.ts';
import type {
  ISettingsRepository,
  NotificationSettings,
  UpdateSettingsData,
} from '../domain/settings.repository.interface.ts';

export class PrismaSettingsRepository implements ISettingsRepository {
  async findByUserId(userId: string): Promise<NotificationSettings | null> {
    return prisma.notificationSettings.findUnique({ where: { userId } });
  }

  async create(userId: string): Promise<NotificationSettings> {
    return prisma.notificationSettings.create({
      data: { userId },
    });
  }

  async update(userId: string, data: UpdateSettingsData): Promise<NotificationSettings> {
    return prisma.notificationSettings.update({
      where: { userId },
      data,
    });
  }

  async upsert(userId: string, data: UpdateSettingsData): Promise<NotificationSettings> {
    return prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
