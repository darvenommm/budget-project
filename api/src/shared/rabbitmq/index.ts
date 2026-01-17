import amqplib from 'amqplib';
import { rabbitmqConfig } from '../../config/index.js';
import { logger } from '../logger/index.js';
import { BudgetEvent, EXCHANGE_NAME } from './events.js';

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

export async function publishEvent(event: BudgetEvent): Promise<void> {
  if (!channel) {
    logger.warn('RabbitMQ channel not available, skipping event publish');
    return;
  }

  const message = Buffer.from(JSON.stringify(event));
  channel.publish(EXCHANGE_NAME, '', message, { persistent: true });
  logger.info('Event published', { type: event.type });
}

export type { BudgetEvent, TransactionCreatedEvent, GoalDepositEvent } from './events.js';
