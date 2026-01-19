import amqplib from 'amqplib';
import { rabbitmqConfig } from '../../config/index.ts';
import { logger } from '../logger/index.ts';
import type { BudgetEvent } from './events.ts';
import { EXCHANGE_NAME } from './events.ts';

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(rabbitmqConfig.url);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    logger.info('RabbitMQ connected');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', { error });
    throw error;
  }
}

export async function disconnectRabbitMQ(): Promise<void> {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
  logger.info('RabbitMQ disconnected');
}

export function publishEvent(event: BudgetEvent): void {
  if (!channel) {
    logger.error('RabbitMQ channel unavailable, event lost', { event });
    return;
  }

  try {
    channel.publish(EXCHANGE_NAME, '', Buffer.from(JSON.stringify(event)), { persistent: true });
    logger.info('Event published', { type: event.type });
  } catch (error) {
    logger.error('Failed to publish event', { error, event });
    throw error;
  }
}

export function isRabbitMQConnected(): boolean {
  return connection !== null && channel !== null;
}

export type { BudgetEvent, TransactionCreatedEvent, GoalDepositEvent } from './events.ts';
export { createTransactionCreatedEvent, createGoalDepositEvent } from './events.ts';
