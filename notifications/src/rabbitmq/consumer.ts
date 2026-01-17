import amqplib from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { rabbitmqConfig } from '../config/index.js';
import { logger } from '../shared/logger/index.js';
import { BudgetEvent, EXCHANGE_NAME, QUEUE_NAME } from './events.js';

export type EventHandler = (event: BudgetEvent) => Promise<void>;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let eventHandler: EventHandler | null = null;

export function setEventHandler(handler: EventHandler): void {
  eventHandler = handler;
}

async function handleMessage(msg: ConsumeMessage | null): Promise<void> {
  if (!msg || !channel || !eventHandler) {
    return;
  }

  try {
    const content = msg.content.toString();
    const event: BudgetEvent = JSON.parse(content);

    logger.info('Event received', { type: event.type });

    await eventHandler(event);

    channel.ack(msg);
    logger.debug('Event processed successfully', { type: event.type });
  } catch (error) {
    logger.error('Failed to process event', { error });
    channel.nack(msg, false, false);
  }
}

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(rabbitmqConfig.url);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

    await channel.consume(QUEUE_NAME, handleMessage);

    logger.info('RabbitMQ consumer connected', { queue: QUEUE_NAME });
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', { error });
    throw error;
  }
}

export async function disconnectRabbitMQ(): Promise<void> {
  await channel?.close();
  await connection?.close();
  logger.info('RabbitMQ disconnected');
}
