import { buildApp } from './app.ts';
import { serverConfig } from './config/index.ts';
import { connectDatabase, disconnectDatabase } from './shared/database/index.ts';
import { connectRabbitMQ, disconnectRabbitMQ } from './shared/rabbitmq/index.ts';
import { logger } from './shared/logger/index.ts';
import { GRACEFUL_SHUTDOWN_TIMEOUT_MS, SHUTDOWN_POLL_INTERVAL_MS } from './shared/constants/index.ts';

let isShuttingDown = false;
let activeRequests = 0;

export function incrementActiveRequests(): void {
  activeRequests++;
}

export function decrementActiveRequests(): void {
  activeRequests--;
}

export function getActiveRequests(): number {
  return activeRequests;
}

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

async function main(): Promise<void> {
  const app = await buildApp();

  // Track active requests
  app.addHook('onRequest', () => {
    incrementActiveRequests();
  });

  app.addHook('onResponse', () => {
    decrementActiveRequests();
  });

  await connectDatabase();
  await connectRabbitMQ();

  await app.listen({ port: serverConfig.port, host: '0.0.0.0' });
  logger.info(`Server started on port ${String(serverConfig.port)}`);

  const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new connections
    await app.close();
    logger.info('HTTP server closed, no new connections accepted');

    // Wait for active requests to complete
    const startTime = Date.now();

    while (activeRequests > 0 && Date.now() - startTime < GRACEFUL_SHUTDOWN_TIMEOUT_MS) {
      logger.info(`Waiting for ${String(activeRequests)} active requests to complete`);
      await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_POLL_INTERVAL_MS));
    }

    if (activeRequests > 0) {
      logger.warn(`Force shutdown with ${String(activeRequests)} active requests`);
    }

    await disconnectRabbitMQ();
    await disconnectDatabase();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
}

main().catch((error: unknown) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
