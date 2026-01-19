import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import amqplib from 'amqplib';

async function waitForRabbitMQ(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const conn = await amqplib.connect(url);
      await conn.close();
      console.log('RabbitMQ is ready');
      return;
    } catch {
      console.log(`Waiting for RabbitMQ... (attempt ${String(i + 1)}/${String(maxAttempts)})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('RabbitMQ failed to become ready');
}

export default async function globalSetup(): Promise<void> {
  console.log('Global setup: Starting containers...');

  console.log('Starting Postgres container...');
  const postgresContainer = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('budget_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl = postgresContainer.getConnectionUri();
  console.log(`Postgres started: ${databaseUrl}`);

  console.log('Starting RabbitMQ container...');
  const rabbitmqContainer = await new RabbitMQContainer('rabbitmq:4-alpine')
    .withExposedPorts(5672)
    .start();

  const rabbitmqHost = rabbitmqContainer.getHost();
  const rabbitmqPort = rabbitmqContainer.getMappedPort(5672);
  const rabbitmqUrl = `amqp://guest:guest@${rabbitmqHost}:${String(rabbitmqPort)}`;
  console.log(`RabbitMQ started: ${rabbitmqUrl}`);

  // Wait for RabbitMQ to be ready to accept connections
  await waitForRabbitMQ(rabbitmqUrl);

  // Run Prisma migrations
  console.log('Running Prisma migrations...');
  execSync(
    `DATABASE_URL="${databaseUrl}" npx prisma migrate deploy --config=./prisma/prisma.config.ts`,
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: '/bin/bash',
    },
  );

  // Write config to a temp file for test processes to read
  const envConfig = {
    DATABASE_URL: databaseUrl,
    RABBITMQ_URL: rabbitmqUrl,
    JWT_ACCESS_SECRET: 'test-access-secret-32-chars-min!!',
    JWT_REFRESH_SECRET: 'test-refresh-secret-32-chars-min!',
    // Store container info for cleanup
    postgresContainerId: postgresContainer.getId(),
    rabbitmqContainerId: rabbitmqContainer.getId(),
  };

  const configPath = path.join(process.cwd(), '.integration-test-config.json');
  fs.writeFileSync(configPath, JSON.stringify(envConfig, null, 2));

  console.log('Global setup complete');
}
