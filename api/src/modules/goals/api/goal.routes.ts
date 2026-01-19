import type { FastifyInstance } from 'fastify';
import { GoalController } from './goal.controller.ts';
import { GoalService } from '../application/goal.service.ts';
import { PrismaGoalRepository } from '../infrastructure/goal.repository.prisma.ts';
import { authMiddleware } from '../../../shared/middleware/auth.ts';

export function goalRoutes(app: FastifyInstance): void {
  const goalRepository = new PrismaGoalRepository();
  const goalService = new GoalService(goalRepository);
  const controller = new GoalController(goalService);

  app.get(
    '/api/goals',
    { preHandler: authMiddleware },
    controller.getAll.bind(controller),
  );
  app.get<{ Params: { id: string } }>(
    '/api/goals/:id',
    { preHandler: authMiddleware },
    controller.getById.bind(controller),
  );
  app.post(
    '/api/goals',
    { preHandler: authMiddleware },
    controller.create.bind(controller),
  );
  app.put<{ Params: { id: string } }>(
    '/api/goals/:id',
    { preHandler: authMiddleware },
    controller.update.bind(controller),
  );
  app.delete<{ Params: { id: string } }>(
    '/api/goals/:id',
    { preHandler: authMiddleware },
    controller.delete.bind(controller),
  );
  app.post<{ Params: { id: string } }>(
    '/api/goals/:id/deposit',
    { preHandler: authMiddleware },
    controller.deposit.bind(controller),
  );
}

export { GoalService } from '../application/goal.service.ts';
export { PrismaGoalRepository } from '../infrastructure/goal.repository.prisma.ts';
