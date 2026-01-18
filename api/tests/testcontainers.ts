import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import { execSync } from 'child_process';

let postgresContainer: StartedPostgreSqlContainer | null = null;
let rabbitmqContainer: StartedRabbitMQContainer | null = null;

export async function startContainers(): Promise<{
  databaseUrl: string;
  rabbitmqUrl: string;
}> {
  console.log('Starting Postgres container...');
  postgresContainer = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('budget_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl = postgresContainer.getConnectionUri();
  console.log(`Postgres started: ${databaseUrl}`);

  console.log('Starting RabbitMQ container...');
  rabbitmqContainer = await new RabbitMQContainer('rabbitmq:4-alpine')
    .withExposedPorts(5672)
    .start();

  const rabbitmqUrl = rabbitmqContainer.getAmqpUrl();
  console.log(`RabbitMQ started: ${rabbitmqUrl}`);

  // Set environment variables
  process.env['DATABASE_URL'] = databaseUrl;
  process.env['RABBITMQ_URL'] = rabbitmqUrl;
  process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-32-chars-min!!';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-32-chars-min!';

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

  return { databaseUrl, rabbitmqUrl };
}

export async function stopContainers(): Promise<void> {
  console.log('Stopping containers...');
  if (postgresContainer) {
    await postgresContainer.stop();
    postgresContainer = null;
  }
  if (rabbitmqContainer) {
    await rabbitmqContainer.stop();
    rabbitmqContainer = null;
  }
  console.log('Containers stopped');
}
