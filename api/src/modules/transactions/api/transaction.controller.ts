import { FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService } from '../application/transaction.service.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
  monthlySpendingSchema,
  transactionParamsSchema,
} from './transaction.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = transactionFilterSchema.safeParse(request.query);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    const transactions = await this.transactionService.getAll(userId, result.data);
    reply.send(transactions);
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const paramsResult = transactionParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: paramsResult.error.flatten() });
      return;
    }

    const transactionId = paramsResult.data.id;

    try {
      const transaction = await this.transactionService.getById(userId, transactionId);
      reply.send(transaction);
    } catch (error) {
      if (error instanceof Error && error.message === 'Transaction not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to get transaction', { error });
      reply.status(500).send({ error: 'Failed to get transaction' });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = createTransactionSchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const transaction = await this.transactionService.create(userId, result.data);
      reply.status(201).send(transaction);
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to create transaction', { error });
      reply.status(500).send({ error: 'Failed to create transaction' });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const paramsResult = transactionParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: paramsResult.error.flatten() });
      return;
    }

    const transactionId = paramsResult.data.id;
    const result = updateTransactionSchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const transaction = await this.transactionService.update(userId, transactionId, result.data);
      reply.send(transaction);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Transaction not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
        if (error.message === 'Category not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
      }
      logger.error('Failed to update transaction', { error });
      reply.status(500).send({ error: 'Failed to update transaction' });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const paramsResult = transactionParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      reply.status(400).send({ error: 'Validation failed', details: paramsResult.error.flatten() });
      return;
    }

    const transactionId = paramsResult.data.id;

    try {
      await this.transactionService.delete(userId, transactionId);
      reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Transaction not found') {
        reply.status(404).send({ error: error.message });
        return;
      }
      logger.error('Failed to delete transaction', { error });
      reply.status(500).send({ error: 'Failed to delete transaction' });
    }
  }

  async getMonthlySpending(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = monthlySpendingSchema.safeParse(request.query);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    const spending = await this.transactionService.getMonthlySpending(
      userId,
      result.data.month,
      result.data.year
    );
    reply.send(spending);
  }
}
