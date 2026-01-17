import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { correlationIdMiddleware } from './shared/middleware/correlation-id.js';
import {
  requestCounterOnRequest,
  requestCounterOnResponse,
  formatMetrics,
} from './shared/middleware/request-counter.js';
import { formatHistogramMetrics } from './shared/decorators/latency-histogram.js';
import { logger } from './shared/logger/index.js';
import { authRoutes } from './modules/auth/api/auth.routes.js';
import { categoryRoutes } from './modules/categories/api/category.routes.js';
import { budgetRoutes } from './modules/budgets/api/budget.routes.js';
import { transactionRoutes } from './modules/transactions/api/transaction.routes.js';
import { goalRoutes } from './modules/goals/api/goal.routes.js';
import { notificationSettingsRoutes } from './modules/notifications/api/notification-settings.routes.js';

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
        { name: 'Notifications', description: 'Notification settings' },
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

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/metrics', async (_request, reply) => {
    const requestMetrics = formatMetrics();
    const histogramMetrics = formatHistogramMetrics();
    const combined = [requestMetrics, histogramMetrics].filter(Boolean).join('\n\n');

    reply.type('text/plain').send(combined);
  });

  await authRoutes(app);
  await categoryRoutes(app);
  await budgetRoutes(app);
  await transactionRoutes(app);
  await goalRoutes(app);
  await notificationSettingsRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    reply.status(500).send({ error: 'Internal Server Error' });
  });

  return app;
}
