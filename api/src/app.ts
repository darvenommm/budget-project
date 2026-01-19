import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { correlationIdMiddleware } from './shared/middleware/correlation-id.ts';
import { AppError } from './shared/errors/index.ts';
import {
  requestCounterOnRequest,
  requestCounterOnResponse,
  formatMetrics,
} from './shared/middleware/request-counter.ts';
import { formatHistogramMetrics } from './shared/decorators/latency-histogram.ts';
import { logger } from './shared/logger/index.ts';
import { prisma } from './shared/database/index.ts';
import { isRabbitMQConnected } from './shared/rabbitmq/index.ts';
import { authRoutes } from './modules/auth/api/auth.routes.ts';
import { categoryRoutes } from './modules/categories/api/category.routes.ts';
import { budgetRoutes } from './modules/budgets/api/budget.routes.ts';
import { transactionRoutes } from './modules/transactions/api/transaction.routes.ts';
import { goalRoutes } from './modules/goals/api/goal.routes.ts';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Budget App API',
        description: 'Personal budgeting application API with Telegram notifications',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Categories', description: 'Category management' },
        { name: 'Budgets', description: 'Budget management' },
        { name: 'Transactions', description: 'Transaction management' },
        { name: 'Goals', description: 'Financial goals' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  app.addHook('onRequest', correlationIdMiddleware);
  app.addHook('onRequest', requestCounterOnRequest);
  app.addHook('onResponse', requestCounterOnResponse);

  app.get('/health', async (_request, reply) => {
    const checks = {
      rabbitmq: isRabbitMQConnected(),
      database: await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    };

    const healthy = Object.values(checks).every(Boolean);

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      service: 'api',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/metrics', (_request, reply) => {
    const requestMetrics = formatMetrics();
    const histogramMetrics = formatHistogramMetrics();
    const combined = [requestMetrics, histogramMetrics].filter(Boolean).join('\n\n');

    return reply.type('text/plain').send(combined);
  });

  authRoutes(app);
  categoryRoutes(app);
  budgetRoutes(app);
  transactionRoutes(app);
  goalRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      logger.warn('Application error', {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
      void reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        ...(error instanceof AppError && 'details' in error ? { details: error.details } : {}),
      });
      return;
    }

    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    void reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
  });

  return app;
}
