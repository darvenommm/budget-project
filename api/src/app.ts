import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
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

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors);

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

  app.setErrorHandler((error, _request, reply) => {
    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    reply.status(500).send({ error: 'Internal Server Error' });
  });

  return app;
}
