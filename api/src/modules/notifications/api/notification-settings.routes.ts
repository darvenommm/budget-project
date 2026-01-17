import { FastifyInstance } from 'fastify';
import { NotificationSettingsController } from './notification-settings.controller.js';
import { NotificationSettingsService } from '../application/notification-settings.service.js';
import { PrismaNotificationSettingsRepository } from '../infrastructure/notification-settings.repository.prisma.js';
import { authMiddleware } from '../../../shared/middleware/auth.js';

export async function notificationSettingsRoutes(app: FastifyInstance): Promise<void> {
  const repository = new PrismaNotificationSettingsRepository();
  const service = new NotificationSettingsService(repository);
  const controller = new NotificationSettingsController(service);

  app.get('/api/notification-settings', { preHandler: authMiddleware }, controller.get.bind(controller));
  app.put('/api/notification-settings', { preHandler: authMiddleware }, controller.update.bind(controller));
  app.post('/api/notification-settings/telegram/link', { preHandler: authMiddleware }, controller.linkTelegram.bind(controller));
  app.delete('/api/notification-settings/telegram/link', { preHandler: authMiddleware }, controller.unlinkTelegram.bind(controller));
}

export { NotificationSettingsService } from '../application/notification-settings.service.js';
export { PrismaNotificationSettingsRepository } from '../infrastructure/notification-settings.repository.prisma.js';
