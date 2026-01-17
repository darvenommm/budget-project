import Fastify from 'fastify';
import { serverConfig } from './config/index.js';
import { connectRabbitMQ, disconnectRabbitMQ, setEventHandler } from './rabbitmq/consumer.js';
import { connectDatabase, disconnectDatabase } from './shared/database/index.js';
import { handleEvent } from './handlers/index.js';
import { logger } from './shared/logger/index.js';

async function main(): Promise<void> {
  const app = Fastify({ logger: false });

  app.get('/health', async () => {
    return { status: 'ok', service: 'notifications' };
  });

  await connectDatabase();

  setEventHandler(handleEvent);
  await connectRabbitMQ();

  await app.listen({ port: serverConfig.port, host: '0.0.0.0' });
  logger.info(`Notifications service started on port ${serverConfig.port}`);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    await app.close();
    logger.info('HTTP server closed');

    await disconnectRabbitMQ();
    await disconnectDatabase();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start notifications service', { error });
  process.exit(1);
});
