import { FastifyInstance } from 'fastify';
import { BudgetController } from './budget.controller.js';
import { BudgetService } from '../application/budget.service.js';
import { PrismaBudgetRepository } from '../infrastructure/budget.repository.prisma.js';
import { PrismaCategoryRepository } from '../../categories/infrastructure/category.repository.prisma.js';
import { authMiddleware } from '../../../shared/middleware/auth.js';

export async function budgetRoutes(app: FastifyInstance): Promise<void> {
  const budgetRepository = new PrismaBudgetRepository();
  const categoryRepository = new PrismaCategoryRepository();
  const budgetService = new BudgetService(budgetRepository, categoryRepository);
  const controller = new BudgetController(budgetService);

  app.get('/api/budgets', { preHandler: authMiddleware }, controller.getAllBudgets.bind(controller));
  app.get('/api/budgets/current', { preHandler: authMiddleware }, controller.getBudget.bind(controller));
  app.post('/api/budgets/current', { preHandler: authMiddleware }, controller.getOrCreateBudget.bind(controller));
  app.post('/api/budgets/current/limits', { preHandler: authMiddleware }, controller.setLimit.bind(controller));
  app.delete('/api/budgets/current/limits/:categoryId', { preHandler: authMiddleware }, controller.removeLimit.bind(controller));
  app.delete('/api/budgets/:id', { preHandler: authMiddleware }, controller.deleteBudget.bind(controller));
}

export { BudgetService } from '../application/budget.service.js';
export { PrismaBudgetRepository } from '../infrastructure/budget.repository.prisma.js';
