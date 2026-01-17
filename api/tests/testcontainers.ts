import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer, StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { execSync } from 'child_process';

let postgresContainer: StartedPostgreSqlContainer | null = null;
let rabbitmqContainer: StartedRabbitMQContainer | null = null;

export async function startContainers(): Promise<{
  databaseUrl: string;
  rabbitmqUrl: string;
}> {
  // Start PostgreSQL
  postgresContainer = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('budget_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl = postgresContainer.getConnectionUri();

  // Start RabbitMQ
  rabbitmqContainer = await new RabbitMQContainer('rabbitmq:4-alpine')
    .withExposedPorts(5672)
    .start();

  const rabbitmqUrl = rabbitmqContainer.getAmqpUrl();

  // Set environment variables
  process.env.DATABASE_URL = databaseUrl;
  process.env.RABBITMQ_URL = rabbitmqUrl;
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-min!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-min!';

  // Run Prisma migrations
  execSync('bunx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    cwd: process.cwd(),
  });

  return { databaseUrl, rabbitmqUrl };
}

export async function stopContainers(): Promise<void> {
  if (postgresContainer) {
    await postgresContainer.stop();
  }
  if (rabbitmqContainer) {
    await rabbitmqContainer.stop();
  }
}
