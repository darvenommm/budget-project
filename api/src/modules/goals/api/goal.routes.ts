import { FastifyInstance } from 'fastify';
import { GoalController } from './goal.controller.js';
import { GoalService } from '../application/goal.service.js';
import { PrismaGoalRepository } from '../infrastructure/goal.repository.prisma.js';
import { authMiddleware } from '../../../shared/middleware/auth.js';

export async function goalRoutes(app: FastifyInstance): Promise<void> {
  const goalRepository = new PrismaGoalRepository();
  const goalService = new GoalService(goalRepository);
  const controller = new GoalController(goalService);

  app.get('/api/goals', { preHandler: authMiddleware }, controller.getAll.bind(controller));
  app.get<{ Params: { id: string } }>('/api/goals/:id', { preHandler: authMiddleware }, controller.getById.bind(controller));
  app.post('/api/goals', { preHandler: authMiddleware }, controller.create.bind(controller));
  app.put<{ Params: { id: string } }>('/api/goals/:id', { preHandler: authMiddleware }, controller.update.bind(controller));
  app.delete<{ Params: { id: string } }>('/api/goals/:id', { preHandler: authMiddleware }, controller.delete.bind(controller));
  app.post<{ Params: { id: string } }>('/api/goals/:id/deposit', { preHandler: authMiddleware }, controller.deposit.bind(controller));
}

export { GoalService } from '../application/goal.service.js';
export { PrismaGoalRepository } from '../infrastructure/goal.repository.prisma.js';
