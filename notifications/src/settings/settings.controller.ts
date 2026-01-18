import { FastifyRequest, FastifyReply } from 'fastify';
import { SettingsService } from './settings.service.js';
import { updateSettingsSchema, linkTelegramSchema } from './settings.dto.js';

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  async get(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const settings = await this.service.getOrCreate(userId);
    reply.send(settings);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const parseResult = updateSettingsSchema.safeParse(request.body);

    if (!parseResult.success) {
      reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      return;
    }

    const settings = await this.service.update(userId, parseResult.data);
    reply.send(settings);
  }

  async linkTelegram(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const parseResult = linkTelegramSchema.safeParse(request.body);

    if (!parseResult.success) {
      reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      return;
    }

    const settings = await this.service.linkTelegram(userId, parseResult.data.chatId);
    reply.send(settings);
  }

  async unlinkTelegram(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const settings = await this.service.unlinkTelegram(userId);
    reply.send(settings);
  }
}
