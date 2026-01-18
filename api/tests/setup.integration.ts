import { startContainers, stopContainers } from './testcontainers.js';
import { connectDatabase, disconnectDatabase } from '../src/shared/database/index.js';
import { connectRabbitMQ, disconnectRabbitMQ } from '../src/shared/rabbitmq/index.js';

// Set test environment
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  await startContainers();
  await connectDatabase();
  await connectRabbitMQ();
}, 120000);

afterAll(async () => {
  await disconnectRabbitMQ();
  await disconnectDatabase();
  await stopContainers();
});
