import { connectDatabase, disconnectDatabase, prisma, pool } from '../src/shared/database/index.ts';
import { connectRabbitMQ, disconnectRabbitMQ } from '../src/shared/rabbitmq/index.ts';

// Containers are started by globalSetup.ts before tests run
// Here we just connect to the already-running services

beforeAll(async () => {
  await connectDatabase();
  await connectRabbitMQ();
}, 30000);

afterAll(async () => {
  // Disconnect in order: RabbitMQ first, then database
  await disconnectRabbitMQ();
  await disconnectDatabase();
  // Ensure all connections are closed
  await prisma.$disconnect();
  await pool.end();
});
