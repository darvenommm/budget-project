import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { SettingsService } from './settings.service.ts';
import { updateSettingsSchema, linkTelegramSchema } from './settings.dto.ts';

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  private getUserId(request: FastifyRequest, reply: FastifyReply): string | null {
    const user = request.user;
    if (!user) {
      void reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }
    return user.id;
  }

  async get(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = this.getUserId(request, reply);
    if (!userId) return;

    const settings = await this.service.getOrCreate(userId);
    await reply.send(settings);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = this.getUserId(request, reply);
    if (!userId) return;

    const parseResult = updateSettingsSchema.safeParse(request.body);
    if (!parseResult.success) {
      await reply
        .status(400)
        .send({ error: 'Invalid request body', details: z.treeifyError(parseResult.error) });
      return;
    }

    const settings = await this.service.update(userId, parseResult.data);
    await reply.send(settings);
  }

  async linkTelegram(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = this.getUserId(request, reply);
    if (!userId) return;

    const parseResult = linkTelegramSchema.safeParse(request.body);
    if (!parseResult.success) {
      await reply
        .status(400)
        .send({ error: 'Invalid request body', details: z.treeifyError(parseResult.error) });
      return;
    }

    const settings = await this.service.linkTelegram(userId, parseResult.data.chatId);
    await reply.send(settings);
  }

  async unlinkTelegram(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = this.getUserId(request, reply);
    if (!userId) return;

    const settings = await this.service.unlinkTelegram(userId);
    await reply.send(settings);
  }
}
