import { beforeAll, afterAll } from 'bun:test';

// Set test environment variables before importing modules
process.env.NODE_ENV = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5433/test';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-min-32-characters-long';
process.env['RABBITMQ_URL'] = 'amqp://test:test@localhost:5672';
process.env['TELEGRAM_BOT_TOKEN'] = 'test-bot-token';

beforeAll(async () => {
  // Setup if needed
});

afterAll(async () => {
  // Cleanup if needed
});
