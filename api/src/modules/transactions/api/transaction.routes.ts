import type { FastifyInstance } from 'fastify';
import { TransactionController } from './transaction.controller.ts';
import { TransactionService } from '../application/transaction.service.ts';
import { PrismaTransactionRepository } from '../infrastructure/transaction.repository.prisma.ts';
import { PrismaBudgetRepository } from '../../budgets/infrastructure/budget.repository.prisma.ts';
import { PrismaCategoryRepository } from '../../categories/infrastructure/category.repository.prisma.ts';
import { authMiddleware } from '../../../shared/middleware/auth.ts';

export function transactionRoutes(app: FastifyInstance): void {
  const transactionRepository = new PrismaTransactionRepository();
  const budgetRepository = new PrismaBudgetRepository();
  const categoryRepository = new PrismaCategoryRepository();
  const transactionService = new TransactionService(
    transactionRepository,
    budgetRepository,
    categoryRepository,
  );
  const controller = new TransactionController(transactionService);

  app.get('/api/transactions', { preHandler: authMiddleware }, controller.getAll.bind(controller));
  app.get(
    '/api/transactions/spending',
    { preHandler: authMiddleware },
    controller.getMonthlySpending.bind(controller),
  );
  app.get(
    '/api/transactions/:id',
    { preHandler: authMiddleware },
    controller.getById.bind(controller),
  );
  app.post('/api/transactions', { preHandler: authMiddleware }, controller.create.bind(controller));
  app.put(
    '/api/transactions/:id',
    { preHandler: authMiddleware },
    controller.update.bind(controller),
  );
  app.delete(
    '/api/transactions/:id',
    { preHandler: authMiddleware },
    controller.delete.bind(controller),
  );
}

export { TransactionService } from '../application/transaction.service.ts';
export { PrismaTransactionRepository } from '../infrastructure/transaction.repository.prisma.ts';
