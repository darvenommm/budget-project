import type { FastifyInstance } from 'fastify';
import { SettingsController } from './settings.controller.ts';
import { SettingsService } from './settings.service.ts';
import { authMiddleware } from '../shared/auth/index.ts';

const settingsService = new SettingsService();
const settingsController = new SettingsController(settingsService);

export function settingsRoutes(app: FastifyInstance): void {
  void app.get(
    '/settings',
    { preHandler: authMiddleware },
    settingsController.get.bind(settingsController),
  );
  void app.put(
    '/settings',
    { preHandler: authMiddleware },
    settingsController.update.bind(settingsController),
  );
  void app.post(
    '/settings/telegram',
    { preHandler: authMiddleware },
    settingsController.linkTelegram.bind(settingsController),
  );
  void app.delete(
    '/settings/telegram',
    { preHandler: authMiddleware },
    settingsController.unlinkTelegram.bind(settingsController),
  );
}
