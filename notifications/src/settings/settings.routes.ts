import { FastifyInstance } from 'fastify';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { authMiddleware } from '../shared/auth/index.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  const service = new SettingsService();
  const controller = new SettingsController(service);

  app.get('/settings', { preHandler: authMiddleware }, controller.get.bind(controller));
  app.put('/settings', { preHandler: authMiddleware }, controller.update.bind(controller));
  app.post('/settings/telegram', { preHandler: authMiddleware }, controller.linkTelegram.bind(controller));
  app.delete('/settings/telegram', { preHandler: authMiddleware }, controller.unlinkTelegram.bind(controller));
}
