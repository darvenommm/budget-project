import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/index.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('error', (e) => {
  logger.error('Database error', { message: e.message });
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
