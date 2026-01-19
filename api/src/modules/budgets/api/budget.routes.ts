import type { FastifyInstance } from 'fastify';
import { BudgetController } from './budget.controller.ts';
import { BudgetService } from '../application/budget.service.ts';
import { PrismaBudgetRepository } from '../infrastructure/budget.repository.prisma.ts';
import { PrismaCategoryRepository } from '../../categories/infrastructure/category.repository.prisma.ts';
import { authMiddleware } from '../../../shared/middleware/auth.ts';

export function budgetRoutes(app: FastifyInstance): void {
  const budgetRepository = new PrismaBudgetRepository();
  const categoryRepository = new PrismaCategoryRepository();
  const budgetService = new BudgetService(budgetRepository, categoryRepository);
  const controller = new BudgetController(budgetService);

  app.get(
    '/api/budgets',
    { preHandler: authMiddleware as never },
    controller.getAllBudgets.bind(controller),
  );
  app.get(
    '/api/budgets/current',
    { preHandler: authMiddleware as never },
    controller.getBudget.bind(controller),
  );
  app.post(
    '/api/budgets/current',
    { preHandler: authMiddleware as never },
    controller.getOrCreateBudget.bind(controller),
  );
  app.post(
    '/api/budgets/current/limits',
    { preHandler: authMiddleware as never },
    controller.setLimit.bind(controller),
  );
  app.delete(
    '/api/budgets/current/limits/:categoryId',
    { preHandler: authMiddleware as never },
    controller.removeLimit.bind(controller),
  );
  app.delete(
    '/api/budgets/:id',
    { preHandler: authMiddleware as never },
    controller.deleteBudget.bind(controller),
  );
}

export { BudgetService } from '../application/budget.service.ts';
export { PrismaBudgetRepository } from '../infrastructure/budget.repository.prisma.ts';
