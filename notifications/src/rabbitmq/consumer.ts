import amqplib from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { rabbitmqConfig } from '../config/index.ts';
import { logger } from '../shared/logger/index.ts';
import type { BudgetEvent } from './events.ts';
import { EXCHANGE_NAME, QUEUE_NAME } from './events.ts';
import { HANDLER_TIMEOUT_MS } from '../shared/constants/index.ts';

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
    const event = JSON.parse(content) as BudgetEvent;

    logger.info('Event received', { type: event.type });

    await Promise.race([
      eventHandler(event),
      new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error('Handler timeout'));
        }, HANDLER_TIMEOUT_MS),
      ),
    ]);

    channel.ack(msg);
    logger.debug('Event processed successfully', { type: event.type });
  } catch (error) {
    logger.error('Message handling failed', { error });
    channel.nack(msg, false, true); // requeue for retry
  }
}

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(rabbitmqConfig.url);
    channel = await connection.createChannel();

    await channel.prefetch(1);

    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

    await channel.consume(QUEUE_NAME, (msg) => {
      void handleMessage(msg);
    });

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

export function isRabbitMQConnected(): boolean {
  return connection !== null && channel !== null;
}

export async function stopConsumer(): Promise<void> {
  if (channel) {
    await channel.cancel(QUEUE_NAME);
    logger.info('RabbitMQ consumer stopped');
  }
}
