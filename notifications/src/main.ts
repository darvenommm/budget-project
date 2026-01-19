import Fastify from 'fastify';
import { serverConfig } from './config/index.ts';
import {
  connectRabbitMQ,
  disconnectRabbitMQ,
  setEventHandler,
  isRabbitMQConnected,
  stopConsumer,
} from './rabbitmq/consumer.ts';
import { connectDatabase, disconnectDatabase, pool } from './shared/database/index.ts';
import { handleEvent } from './handlers/index.ts';
import { logger } from './shared/logger/index.ts';
import { settingsRoutes } from './settings/index.ts';
import {
  GRACEFUL_SHUTDOWN_TIMEOUT_MS,
  SHUTDOWN_POLL_INTERVAL_MS,
} from './shared/constants/index.ts';

let isShuttingDown = false;
let activeHandlers = 0;

export function incrementActiveHandlers(): void {
  activeHandlers++;
}

export function decrementActiveHandlers(): void {
  activeHandlers--;
}

export function getActiveHandlers(): number {
  return activeHandlers;
}

async function main(): Promise<void> {
  const app = Fastify({ logger: false });

  app.get('/health', async (_request, reply) => {
    const checks = {
      rabbitmq: isRabbitMQConnected(),
      database: await pool.query('SELECT 1').then(() => true).catch(() => false),
    };

    const healthy = Object.values(checks).every(Boolean);

    await reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      service: 'notifications',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  await connectDatabase();
  settingsRoutes(app);

  // Wrap event handler with active handler tracking
  const wrappedEventHandler = async (event: Parameters<typeof handleEvent>[0]): Promise<void> => {
    incrementActiveHandlers();
    try {
      await handleEvent(event);
    } finally {
      decrementActiveHandlers();
    }
  };

  setEventHandler(wrappedEventHandler);
  await connectRabbitMQ();

  await app.listen({ port: serverConfig.port, host: '0.0.0.0' });
  logger.info(`Notifications service started on port ${String(serverConfig.port)}`);

  const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new messages
    await stopConsumer();

    // Wait for active handlers to complete
    const startTime = Date.now();

    while (activeHandlers > 0 && Date.now() - startTime < GRACEFUL_SHUTDOWN_TIMEOUT_MS) {
      logger.info(`Waiting for ${String(activeHandlers)} active handlers to complete`);
      await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_POLL_INTERVAL_MS));
    }

    if (activeHandlers > 0) {
      logger.warn(`Force shutdown with ${String(activeHandlers)} active handlers`);
    }

    // Close connections
    await app.close();
    logger.info('HTTP server closed');

    await disconnectRabbitMQ();
    await disconnectDatabase();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
}

main().catch((error: unknown) => {
  logger.error('Failed to start notifications service', { error });
  process.exit(1);
});
