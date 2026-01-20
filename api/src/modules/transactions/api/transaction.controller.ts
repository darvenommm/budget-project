import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { TransactionService } from '../application/transaction.service.ts';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
  monthlySpendingSchema,
  transactionParamsSchema,
} from './transaction.dto.ts';
import { ValidationError } from '../../../shared/errors/index.ts';
import { getAuthenticatedUser } from '../../../shared/middleware/auth.ts';

export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const result = transactionFilterSchema.safeParse(request.query);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', z.treeifyError(result.error));
    }

    const transactions = await this.transactionService.getAll(userId, result.data);
    return reply.send(transactions);
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const paramsResult = transactionParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(paramsResult.error),
      );
    }

    const transactionId = paramsResult.data.id;
    const transaction = await this.transactionService.getById(userId, transactionId);
    return reply.send(transaction);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const result = createTransactionSchema.safeParse(request.body);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', z.treeifyError(result.error));
    }

    const transaction = await this.transactionService.create(userId, result.data);
    return reply.status(201).send(transaction);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const paramsResult = transactionParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(paramsResult.error),
      );
    }

    const transactionId = paramsResult.data.id;
    const result = updateTransactionSchema.safeParse(request.body);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', z.treeifyError(result.error));
    }

    const transaction = await this.transactionService.update(userId, transactionId, result.data);
    return reply.send(transaction);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const paramsResult = transactionParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Validation failed',
        z.treeifyError(paramsResult.error),
      );
    }

    const transactionId = paramsResult.data.id;
    await this.transactionService.delete(userId, transactionId);
    return reply.status(204).send();
  }

  async getMonthlySpending(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = getAuthenticatedUser(request).id;
    const result = monthlySpendingSchema.safeParse(request.query);

    if (!result.success) {
      throw new ValidationError('VALIDATION_FAILED', 'Validation failed', z.treeifyError(result.error));
    }

    const spending = await this.transactionService.getMonthlySpending(
      userId,
      result.data.month,
      result.data.year,
    );
    return reply.send(spending);
  }
}
