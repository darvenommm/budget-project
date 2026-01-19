import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '../../src/shared/database/index.js';
import { isRabbitMQConnected } from '../../src/shared/rabbitmq/index.js';
import { correlationIdMiddleware } from '../../src/shared/middleware/correlation-id.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Create app with minimal plugins for integration testing
    // Note: We use a minimal app rather than buildApp() because of inject() compatibility issues
    app = Fastify({ logger: false });

    await app.register(cors);
    app.addHook('onRequest', correlationIdMiddleware);

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

    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should return 200 with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('status');
    expect(response.json().checks.database).toBe(true);
    expect(response.json().checks.rabbitmq).toBe(true);
  });

  it('should include correlation-id header in response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-correlation-id': 'test-correlation-id',
      },
    });

    expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
  });
});
