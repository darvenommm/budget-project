import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationSettingsService } from '../application/notification-settings.service.js';
import { updateNotificationSettingsSchema, linkTelegramSchema } from './notification-settings.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class NotificationSettingsController {
  constructor(private service: NotificationSettingsService) {}

  async get(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;

    try {
      const settings = await this.service.getOrCreate(userId);
      reply.send(settings);
    } catch (error) {
      logger.error('Failed to get notification settings', { error });
      reply.status(500).send({ error: 'Failed to get notification settings' });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = updateNotificationSettingsSchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const settings = await this.service.update(userId, result.data);
      reply.send(settings);
    } catch (error) {
      logger.error('Failed to update notification settings', { error });
      reply.status(500).send({ error: 'Failed to update notification settings' });
    }
  }

  async linkTelegram(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = linkTelegramSchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const settings = await this.service.linkTelegram(userId, result.data.chatId);
      reply.send(settings);
    } catch (error) {
      logger.error('Failed to link Telegram', { error });
      reply.status(500).send({ error: 'Failed to link Telegram' });
    }
  }

  async unlinkTelegram(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;

    try {
      const settings = await this.service.unlinkTelegram(userId);
      reply.send(settings);
    } catch (error) {
      logger.error('Failed to unlink Telegram', { error });
      reply.status(500).send({ error: 'Failed to unlink Telegram' });
    }
  }
}
