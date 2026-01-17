# BudgetApp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal budgeting application with Telegram notifications, clean architecture, Docker deployment.

**Architecture:** Hybrid approach - monolith API (auth, budgets, transactions, goals, categories) + separate notification microservice consuming RabbitMQ events and sending Telegram messages.

**Tech Stack:** TypeScript, Bun, Fastify, Prisma ORM, PostgreSQL, RabbitMQ, Bun test, Docker

---

## Phase 1: Project Setup

### Task 1.1: Initialize monorepo structure

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `notifications/package.json`
- Create: `notifications/tsconfig.json`

**Step 1: Create root package.json**

```json
{
  "name": "budget-app",
  "private": true,
  "workspaces": ["api", "notifications"],
  "scripts": {
    "api:dev": "bun run dev --filter api",
    "api:build": "bun run build --filter api",
    "api:test": "bun run test --filter api",
    "notifications:dev": "bun run dev --filter notifications",
    "notifications:build": "bun run build --filter notifications",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.2",
    "eslint": "^9.17.0",
    "@eslint/js": "^9.17.0",
    "typescript-eslint": "^8.19.0"
  }
}
```

**Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
.env
*.log
coverage/
.prisma/
```

**Step 4: Create .env.example**

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/budget_app

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# RabbitMQ
RABBITMQ_URL=amqp://user:password@localhost:5672

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token

# Server
PORT=3000
NODE_ENV=development
```

**Step 5: Create api/package.json**

```json
{
  "name": "api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun",
    "start": "bun dist/main.js",
    "test": "bun test",
    "test:cov": "bun test --coverage",
    "db:migrate": "bunx prisma migrate dev",
    "db:generate": "bunx prisma generate"
  },
  "dependencies": {
    "fastify": "^5.2.1",
    "@fastify/cors": "^11.0.0",
    "@fastify/swagger": "^9.4.2",
    "@fastify/swagger-ui": "^5.2.1",
    "@prisma/client": "^6.2.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "pino": "^9.6.0",
    "amqplib": "^0.10.5",
    "zod": "^3.24.1",
    "uuid": "^11.0.5"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/amqplib": "^0.10.6",
    "@types/uuid": "^10.0.0",
    "prisma": "^6.2.1",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    "testcontainers": "^10.18.0",
    "@testcontainers/postgresql": "^10.18.0",
    "@testcontainers/rabbitmq": "^10.18.0"
  }
}
```

**Step 6: Create api/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 7: Create notifications/package.json**

```json
{
  "name": "notifications",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun",
    "start": "bun dist/main.js",
    "test": "bun test"
  },
  "dependencies": {
    "amqplib": "^0.10.5",
    "pino": "^9.6.0",
    "fastify": "^5.2.1",
    "@prisma/client": "^6.2.1"
  },
  "devDependencies": {
    "@types/amqplib": "^0.10.6",
    "prisma": "^6.2.1"
  }
}
```

**Step 8: Create notifications/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 9: Install dependencies**

Run: `bun install`
Expected: Successful installation with no errors

**Step 10: Commit**

```bash
git init
git add .
git commit -m "chore: initialize monorepo structure"
```

---

### Task 1.2: Setup ESLint

**Files:**
- Create: `eslint.config.js`

**Step 1: Create eslint.config.js**

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
);
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors (no source files yet)

**Step 3: Commit**

```bash
git add .
git commit -m "chore: setup eslint"
```

---

### Task 1.3: Setup Prisma schema

**Files:**
- Create: `api/prisma/schema.prisma`

**Step 1: Create api/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  categories           Category[]
  budgets              Budget[]
  transactions         Transaction[]
  goals                Goal[]
  notificationSettings NotificationSettings?
  refreshTokens        RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Category {
  id        String  @id @default(uuid())
  userId    String  @map("user_id")
  name      String
  icon      String?
  isDefault Boolean @default(false) @map("is_default")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  budgetLimits BudgetLimit[]
  transactions Transaction[]

  @@unique([userId, name])
  @@map("categories")
}

model Budget {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  month     Int
  year      Int
  createdAt DateTime @default(now()) @map("created_at")

  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  limits BudgetLimit[]

  @@unique([userId, month, year])
  @@map("budgets")
}

model BudgetLimit {
  id          String  @id @default(uuid())
  budgetId    String  @map("budget_id")
  categoryId  String  @map("category_id")
  limitAmount Decimal @map("limit_amount") @db.Decimal(12, 2)

  budget   Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([budgetId, categoryId])
  @@map("budget_limits")
}

model Transaction {
  id          String          @id @default(uuid())
  userId      String          @map("user_id")
  categoryId  String          @map("category_id")
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  description String?
  date        DateTime        @db.Date
  createdAt   DateTime        @default(now()) @map("created_at")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@map("transactions")
}

enum TransactionType {
  INCOME
  EXPENSE
}

model Goal {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  name          String
  targetAmount  Decimal   @map("target_amount") @db.Decimal(12, 2)
  currentAmount Decimal   @default(0) @map("current_amount") @db.Decimal(12, 2)
  deadline      DateTime? @db.Date
  createdAt     DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("goals")
}

model NotificationSettings {
  id                  String  @id @default(uuid())
  userId              String  @unique @map("user_id")
  telegramChatId      String? @map("telegram_chat_id")
  notifyLimitExceeded Boolean @default(true) @map("notify_limit_exceeded")
  notifyGoalReached   Boolean @default(true) @map("notify_goal_reached")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_settings")
}
```

**Step 2: Generate Prisma client**

Run: `cd api && npx prisma generate`
Expected: Prisma Client generated successfully

**Step 3: Commit**

```bash
git add .
git commit -m "chore: setup prisma schema with all models"
```

---

### Task 1.4: Setup config module

**Files:**
- Create: `api/src/config/index.ts`
- Create: `api/src/config/env.ts`

**Step 1: Create api/src/config/env.ts**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RABBITMQ_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}
```

**Step 2: Create api/src/config/index.ts**

```typescript
import { loadEnv } from './env.js';

export const config = loadEnv();

export const jwtConfig = {
  accessSecret: config.JWT_ACCESS_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiresIn: config.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

export const serverConfig = {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
};

export const databaseConfig = {
  url: config.DATABASE_URL,
};

export const rabbitmqConfig = {
  url: config.RABBITMQ_URL,
};
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add config module with env validation"
```

---

### Task 1.5: Setup logger with Correlation-ID

**Files:**
- Create: `api/src/shared/logger/index.ts`
- Create: `api/src/shared/logger/context.ts`

**Step 1: Create api/src/shared/logger/context.ts**

```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface LogContext {
  correlationId: string;
}

export const logContext = new AsyncLocalStorage<LogContext>();

export function getCorrelationId(): string {
  return logContext.getStore()?.correlationId ?? 'no-correlation-id';
}

export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return logContext.run({ correlationId }, fn);
}
```

**Step 2: Create api/src/shared/logger/index.ts**

```typescript
import pino from 'pino';
import { getCorrelationId } from './context.js';

const baseLogger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = {
  info: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.info({ correlationId: getCorrelationId(), ...data }, msg);
  },
  warn: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.warn({ correlationId: getCorrelationId(), ...data }, msg);
  },
  error: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.error({ correlationId: getCorrelationId(), ...data }, msg);
  },
  debug: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.debug({ correlationId: getCorrelationId(), ...data }, msg);
  },
};

export { getCorrelationId, runWithCorrelationId } from './context.js';
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add logger with correlation-id support"
```

---

### Task 1.6: Setup middleware

**Files:**
- Create: `api/src/shared/middleware/correlation-id.ts`
- Create: `api/src/shared/middleware/request-counter.ts`

**Step 1: Create api/src/shared/middleware/correlation-id.ts**

```typescript
import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { runWithCorrelationId } from '../logger/index.js';

const CORRELATION_ID_HEADER = 'x-correlation-id';

export function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const correlationId = (request.headers[CORRELATION_ID_HEADER] as string) ?? uuidv4();

  reply.header(CORRELATION_ID_HEADER, correlationId);

  runWithCorrelationId(correlationId, () => {
    done();
  });
}
```

**Step 2: Create api/src/shared/middleware/request-counter.ts**

```typescript
import { FastifyReply, FastifyRequest } from 'fastify';

interface Metrics {
  totalRequests: number;
  requests2xx: number;
  requests4xx: number;
  requests5xx: number;
}

const metrics: Metrics = {
  totalRequests: 0,
  requests2xx: 0,
  requests4xx: 0,
  requests5xx: 0,
};

export function requestCounterOnRequest(): void {
  metrics.totalRequests++;
}

export function requestCounterOnResponse(_request: FastifyRequest, reply: FastifyReply): void {
  const statusCode = reply.statusCode;

  if (statusCode >= 200 && statusCode < 300) {
    metrics.requests2xx++;
  } else if (statusCode >= 400 && statusCode < 500) {
    metrics.requests4xx++;
  } else if (statusCode >= 500) {
    metrics.requests5xx++;
  }
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function formatMetrics(): string {
  return [
    `http_requests_total ${metrics.totalRequests}`,
    `http_requests_2xx_total ${metrics.requests2xx}`,
    `http_requests_4xx_total ${metrics.requests4xx}`,
    `http_requests_5xx_total ${metrics.requests5xx}`,
  ].join('\n');
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add correlation-id and request-counter middleware"
```

---

### Task 1.7: Setup latency histogram decorator

**Files:**
- Create: `api/src/shared/decorators/latency-histogram.ts`

**Step 1: Create api/src/shared/decorators/latency-histogram.ts**

```typescript
interface HistogramBucket {
  le: number;
  count: number;
}

interface Histogram {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

const histograms: Map<string, Histogram> = new Map();

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function getOrCreateHistogram(name: string): Histogram {
  if (!histograms.has(name)) {
    histograms.set(name, {
      buckets: DEFAULT_BUCKETS.map((le) => ({ le, count: 0 })),
      sum: 0,
      count: 0,
    });
  }
  return histograms.get(name)!;
}

function recordDuration(name: string, durationSeconds: number): void {
  const histogram = getOrCreateHistogram(name);
  histogram.sum += durationSeconds;
  histogram.count++;

  for (const bucket of histogram.buckets) {
    if (durationSeconds <= bucket.le) {
      bucket.count++;
    }
  }
}

export function LatencyHistogram(name: string): MethodDecorator {
  return function (
    _target: unknown,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const start = performance.now();
      try {
        return await originalMethod.apply(this, args);
      } finally {
        const durationMs = performance.now() - start;
        recordDuration(name, durationMs / 1000);
      }
    };

    return descriptor;
  };
}

export function formatHistogramMetrics(): string {
  const lines: string[] = [];

  for (const [name, histogram] of histograms) {
    for (const bucket of histogram.buckets) {
      lines.push(`${name}_duration_seconds_bucket{le="${bucket.le}"} ${bucket.count}`);
    }
    lines.push(`${name}_duration_seconds_bucket{le="+Inf"} ${histogram.count}`);
    lines.push(`${name}_duration_seconds_sum ${histogram.sum}`);
    lines.push(`${name}_duration_seconds_count ${histogram.count}`);
  }

  return lines.join('\n');
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add latency histogram decorator"
```

---

### Task 1.8: Setup database connection

**Files:**
- Create: `api/src/shared/database/index.ts`

**Step 1: Create api/src/shared/database/index.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/index.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug('Database query', { query: e.query, duration: e.duration });
});

prisma.$on('error', (e) => {
  logger.error('Database error', { message: e.message });
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add database connection with prisma"
```

---

### Task 1.9: Setup RabbitMQ publisher

**Files:**
- Create: `api/src/shared/rabbitmq/index.ts`
- Create: `api/src/shared/rabbitmq/events.ts`

**Step 1: Create api/src/shared/rabbitmq/events.ts**

```typescript
export const EXCHANGE_NAME = 'budget.events';

export interface TransactionCreatedEvent {
  type: 'TRANSACTION_CREATED';
  payload: {
    userId: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    budgetId: string;
    currentSpent: number;
    limitAmount: number;
  };
}

export interface GoalDepositEvent {
  type: 'GOAL_DEPOSIT';
  payload: {
    userId: string;
    goalId: string;
    goalName: string;
    currentAmount: number;
    targetAmount: number;
  };
}

export type BudgetEvent = TransactionCreatedEvent | GoalDepositEvent;
```

**Step 2: Create api/src/shared/rabbitmq/index.ts**

```typescript
import amqplib, { Channel, Connection } from 'amqplib';
import { rabbitmqConfig } from '../../config/index.js';
import { logger } from '../logger/index.js';
import { BudgetEvent, EXCHANGE_NAME } from './events.js';

let connection: Connection | null = null;
let channel: Channel | null = null;

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

export { BudgetEvent, TransactionCreatedEvent, GoalDepositEvent } from './events.js';
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add rabbitmq publisher"
```

---

### Task 1.10: Create main entry point with graceful shutdown

**Files:**
- Create: `api/src/main.ts`
- Create: `api/src/app.ts`

**Step 1: Create api/src/app.ts**

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { correlationIdMiddleware } from './shared/middleware/correlation-id.js';
import {
  requestCounterOnRequest,
  requestCounterOnResponse,
  formatMetrics,
} from './shared/middleware/request-counter.js';
import { formatHistogramMetrics } from './shared/decorators/latency-histogram.js';
import { logger } from './shared/logger/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors);

  app.addHook('onRequest', correlationIdMiddleware);
  app.addHook('onRequest', requestCounterOnRequest);
  app.addHook('onResponse', requestCounterOnResponse);

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/metrics', async (_request, reply) => {
    const requestMetrics = formatMetrics();
    const histogramMetrics = formatHistogramMetrics();
    const combined = [requestMetrics, histogramMetrics].filter(Boolean).join('\n\n');

    reply.type('text/plain').send(combined);
  });

  app.setErrorHandler((error, _request, reply) => {
    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    reply.status(500).send({ error: 'Internal Server Error' });
  });

  return app;
}
```

**Step 2: Create api/src/main.ts**

```typescript
import { buildApp } from './app.js';
import { serverConfig } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './shared/database/index.js';
import { connectRabbitMQ, disconnectRabbitMQ } from './shared/rabbitmq/index.js';
import { logger } from './shared/logger/index.js';

async function main(): Promise<void> {
  const app = await buildApp();

  await connectDatabase();
  await connectRabbitMQ();

  await app.listen({ port: serverConfig.port, host: '0.0.0.0' });
  logger.info(`Server started on port ${serverConfig.port}`);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    await app.close();
    logger.info('HTTP server closed');

    await disconnectRabbitMQ();
    await disconnectDatabase();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add main entry point with graceful shutdown"
```

---

### Task 1.11: Setup Bun test configuration with Testcontainers

**Files:**
- Create: `api/tests/setup.ts`
- Create: `api/tests/testcontainers.ts`

**Step 1: Create api/tests/testcontainers.ts**

```typescript
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
```

**Step 2: Create api/tests/setup.ts**

```typescript
import { beforeAll, afterAll } from 'bun:test';
import { startContainers, stopContainers } from './testcontainers.js';
import { prisma } from '../src/shared/database/index.js';

beforeAll(async () => {
  await startContainers();
});

afterAll(async () => {
  await prisma.$disconnect();
  await stopContainers();
});
```

**Step 3: Update bunfig.toml for test preload**

Create `api/bunfig.toml`:

```toml
[test]
preload = ["./tests/setup.ts"]
```

**Step 4: Commit**

```bash
git add .
git commit -m "chore: setup bun test with testcontainers"
```

---

### Task 1.12: Write integration test for health endpoint

**Files:**
- Create: `api/tests/integration/health.spec.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 with status ok', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should include correlation-id header in response', async () => {
    const response = await supertest(app.server)
      .get('/health')
      .set('x-correlation-id', 'test-correlation-id');

    expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
  });
});
```

**Step 2: Run test**

Run: `cd api && bun test`
Expected: PASS (health endpoint already implemented in app.ts)

**Step 3: Commit**

```bash
git add .
git commit -m "test: add integration test for health endpoint"
```

---

## Phase 2: Auth Module

### Task 2.1: Create auth domain layer

**Files:**
- Create: `api/src/modules/auth/domain/user.entity.ts`
- Create: `api/src/modules/auth/domain/user.repository.ts`

**Step 1: Create api/src/modules/auth/domain/user.entity.ts**

```typescript
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
}
```

**Step 2: Create api/src/modules/auth/domain/user.repository.ts**

```typescript
import { User, CreateUserData } from './user.entity.js';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat(auth): add user entity and repository interface"
```

---

### Task 2.2: Create auth infrastructure layer

**Files:**
- Create: `api/src/modules/auth/infrastructure/user.repository.prisma.ts`
- Create: `api/src/modules/auth/infrastructure/token.repository.prisma.ts`

**Step 1: Create api/src/modules/auth/infrastructure/user.repository.prisma.ts**

```typescript
import { prisma } from '../../../shared/database/index.js';
import { User, CreateUserData, UserRepository } from '../domain/user.repository.js';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.js';

export class PrismaUserRepository implements UserRepository {
  @LatencyHistogram('db_user')
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  @LatencyHistogram('db_user')
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  @LatencyHistogram('db_user')
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({ data });
  }
}
```

**Step 2: Create api/src/modules/auth/infrastructure/token.repository.prisma.ts**

```typescript
import { prisma } from '../../../shared/database/index.js';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.js';

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface TokenRepository {
  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
  findRefreshToken(token: string): Promise<RefreshToken | null>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllUserTokens(userId: string): Promise<void>;
}

export class PrismaTokenRepository implements TokenRepository {
  @LatencyHistogram('db_token')
  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  @LatencyHistogram('db_token')
  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  @LatencyHistogram('db_token')
  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { token } }).catch(() => {});
  }

  @LatencyHistogram('db_token')
  async deleteAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat(auth): add prisma user and token repositories"
```

---

### Task 2.3: Create auth application layer

**Files:**
- Create: `api/src/modules/auth/application/auth.service.ts`
- Create: `api/src/modules/auth/application/password.service.ts`
- Create: `api/src/modules/auth/application/jwt.service.ts`

**Step 1: Create api/src/modules/auth/application/password.service.ts**

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Step 2: Create api/src/modules/auth/application/jwt.service.ts**

```typescript
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../../config/index.js';

export interface TokenPayload {
  userId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, jwtConfig.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, jwtConfig.refreshSecret) as TokenPayload;
}

export function generateTokenPair(userId: string): TokenPair {
  return {
    accessToken: generateAccessToken({ userId }),
    refreshToken: generateRefreshToken({ userId }),
  };
}

export function getRefreshTokenExpiry(): Date {
  const match = jwtConfig.refreshExpiresIn.match(/^(\d+)([dhms])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * multipliers[unit]);
}
```

**Step 3: Create api/src/modules/auth/application/auth.service.ts**

```typescript
import { UserRepository } from '../domain/user.repository.js';
import { TokenRepository } from '../infrastructure/token.repository.prisma.js';
import { hashPassword, verifyPassword } from './password.service.js';
import {
  generateTokenPair,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  TokenPair,
} from './jwt.service.js';
import { logger } from '../../../shared/logger/index.js';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private tokenRepository: TokenRepository
  ) {}

  async register(input: RegisterInput): Promise<TokenPair> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    const tokens = generateTokenPair(user.id);
    await this.tokenRepository.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      getRefreshTokenExpiry()
    );

    return tokens;
  }

  async login(input: LoginInput): Promise<TokenPair> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    logger.info('User logged in', { userId: user.id });

    const tokens = generateTokenPair(user.id);
    await this.tokenRepository.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      getRefreshTokenExpiry()
    );

    return tokens;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const storedToken = await this.tokenRepository.findRefreshToken(refreshToken);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    const payload = verifyRefreshToken(refreshToken);

    await this.tokenRepository.deleteRefreshToken(refreshToken);

    const tokens = generateTokenPair(payload.userId);
    await this.tokenRepository.saveRefreshToken(
      payload.userId,
      tokens.refreshToken,
      getRefreshTokenExpiry()
    );

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenRepository.deleteRefreshToken(refreshToken);
    logger.info('User logged out');
  }
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(auth): add auth service with register, login, refresh, logout"
```

---

### Task 2.4: Create auth API layer

**Files:**
- Create: `api/src/modules/auth/api/auth.dto.ts`
- Create: `api/src/modules/auth/api/auth.controller.ts`
- Create: `api/src/modules/auth/api/auth.routes.ts`

**Step 1: Create api/src/modules/auth/api/auth.dto.ts**

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
```

**Step 2: Create api/src/modules/auth/api/auth.controller.ts**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../application/auth.service.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const tokens = await this.authService.register(result.data);
      reply.status(201).send(tokens);
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already registered') {
        reply.status(409).send({ error: error.message });
        return;
      }
      logger.error('Registration failed', { error });
      reply.status(500).send({ error: 'Registration failed' });
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const tokens = await this.authService.login(result.data);
      reply.send(tokens);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        reply.status(401).send({ error: error.message });
        return;
      }
      logger.error('Login failed', { error });
      reply.status(500).send({ error: 'Login failed' });
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = refreshSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const tokens = await this.authService.refresh(result.data.refreshToken);
      reply.send(tokens);
    } catch (error) {
      reply.status(401).send({ error: 'Invalid refresh token' });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = refreshSchema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    await this.authService.logout(result.data.refreshToken);
    reply.status(204).send();
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = (request as FastifyRequest & { user?: { id: string; email: string } }).user;
    if (!user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    reply.send({ id: user.id, email: user.email });
  }
}
```

**Step 3: Create api/src/modules/auth/api/auth.routes.ts**

```typescript
import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { AuthService } from '../application/auth.service.js';
import { PrismaUserRepository } from '../infrastructure/user.repository.prisma.js';
import { PrismaTokenRepository } from '../infrastructure/token.repository.prisma.js';
import { authMiddleware } from '../../../shared/middleware/auth.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const userRepository = new PrismaUserRepository();
  const tokenRepository = new PrismaTokenRepository();
  const authService = new AuthService(userRepository, tokenRepository);
  const controller = new AuthController(authService);

  app.post('/api/auth/register', controller.register.bind(controller));
  app.post('/api/auth/login', controller.login.bind(controller));
  app.post('/api/auth/refresh', controller.refresh.bind(controller));
  app.post('/api/auth/logout', controller.logout.bind(controller));
  app.get('/api/auth/me', { preHandler: authMiddleware }, controller.me.bind(controller));
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(auth): add auth controller and routes"
```

---

### Task 2.5: Create auth middleware

**Files:**
- Create: `api/src/shared/middleware/auth.ts`

**Step 1: Create api/src/shared/middleware/auth.ts**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../../modules/auth/application/jwt.service.js';
import { prisma } from '../database/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      reply.status(401).send({ error: 'User not found' });
      return;
    }

    request.user = user;
  } catch {
    reply.status(401).send({ error: 'Invalid token' });
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat(auth): add auth middleware"
```

---

### Task 2.6: Register auth routes in app

**Files:**
- Modify: `api/src/app.ts`

**Step 1: Update api/src/app.ts**

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { correlationIdMiddleware } from './shared/middleware/correlation-id.js';
import {
  requestCounterOnRequest,
  requestCounterOnResponse,
  formatMetrics,
} from './shared/middleware/request-counter.js';
import { formatHistogramMetrics } from './shared/decorators/latency-histogram.js';
import { logger } from './shared/logger/index.js';
import { authRoutes } from './modules/auth/api/auth.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors);

  app.addHook('onRequest', correlationIdMiddleware);
  app.addHook('onRequest', requestCounterOnRequest);
  app.addHook('onResponse', requestCounterOnResponse);

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/metrics', async (_request, reply) => {
    const requestMetrics = formatMetrics();
    const histogramMetrics = formatHistogramMetrics();
    const combined = [requestMetrics, histogramMetrics].filter(Boolean).join('\n\n');

    reply.type('text/plain').send(combined);
  });

  await authRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    logger.error('Unhandled error', { error: error.message, stack: error.stack });
    reply.status(500).send({ error: 'Internal Server Error' });
  });

  return app;
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat(auth): register auth routes in app"
```

---

### Task 2.7: Write auth unit tests

**Files:**
- Create: `api/tests/unit/auth.service.spec.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthService } from '../../src/modules/auth/application/auth.service.js';
import { hashPassword } from '../../src/modules/auth/application/password.service.js';

describe('AuthService', () => {
  const mockUserRepository = {
    findByEmail: mock(() => Promise.resolve(null)),
    findById: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve(null)),
  };

  const mockTokenRepository = {
    saveRefreshToken: mock(() => Promise.resolve({})),
    findRefreshToken: mock(() => Promise.resolve(null)),
    deleteRefreshToken: mock(() => Promise.resolve()),
    deleteAllUserTokens: mock(() => Promise.resolve()),
  };

  let authService: AuthService;

  beforeEach(() => {
    mockUserRepository.findByEmail.mockReset();
    mockUserRepository.findById.mockReset();
    mockUserRepository.create.mockReset();
    mockTokenRepository.saveRefreshToken.mockReset();
    mockTokenRepository.findRefreshToken.mockReset();
    mockTokenRepository.deleteRefreshToken.mockReset();
    mockTokenRepository.deleteAllUserTokens.mockReset();
    authService = new AuthService(mockUserRepository, mockTokenRepository);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockTokenRepository.saveRefreshToken.mockResolvedValue({});

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw error if email already registered', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });

      expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login and return tokens', async () => {
      const passwordHash = await hashPassword('password123');
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash,
      });
      mockTokenRepository.saveRefreshToken.mockResolvedValue({});

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

**Step 2: Run tests**

Run: `cd api && bun test`
Expected: PASS

**Step 3: Commit**

```bash
git add .
git commit -m "test(auth): add auth service unit tests"
```

---

## Phase 3: Categories Module

### Task 3.1: Create categories domain and infrastructure

**Files:**
- Create: `api/src/modules/categories/domain/category.entity.ts`
- Create: `api/src/modules/categories/domain/category.repository.ts`
- Create: `api/src/modules/categories/infrastructure/category.repository.prisma.ts`

**Step 1: Create api/src/modules/categories/domain/category.entity.ts**

```typescript
export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
}

export interface CreateCategoryData {
  userId: string;
  name: string;
  icon?: string;
  isDefault?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
}

export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Shopping', icon: '🛒' },
  { name: 'Health', icon: '💊' },
  { name: 'Bills', icon: '📄' },
  { name: 'Other', icon: '📦' },
];
```

**Step 2: Create api/src/modules/categories/domain/category.repository.ts**

```typescript
import { Category, CreateCategoryData, UpdateCategoryData } from './category.entity.js';

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findByUserId(userId: string): Promise<Category[]>;
  findByUserIdAndName(userId: string, name: string): Promise<Category | null>;
  create(data: CreateCategoryData): Promise<Category>;
  createMany(data: CreateCategoryData[]): Promise<void>;
  update(id: string, data: UpdateCategoryData): Promise<Category>;
  delete(id: string): Promise<void>;
  hasTransactions(categoryId: string): Promise<boolean>;
}
```

**Step 3: Create api/src/modules/categories/infrastructure/category.repository.prisma.ts**

```typescript
import { prisma } from '../../../shared/database/index.js';
import { Category, CreateCategoryData, UpdateCategoryData } from '../domain/category.entity.js';
import { CategoryRepository } from '../domain/category.repository.js';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.js';

export class PrismaCategoryRepository implements CategoryRepository {
  @LatencyHistogram('db_category')
  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  @LatencyHistogram('db_category')
  async findByUserId(userId: string): Promise<Category[]> {
    return prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }

  @LatencyHistogram('db_category')
  async findByUserIdAndName(userId: string, name: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { userId_name: { userId, name } } });
  }

  @LatencyHistogram('db_category')
  async create(data: CreateCategoryData): Promise<Category> {
    return prisma.category.create({ data });
  }

  @LatencyHistogram('db_category')
  async createMany(data: CreateCategoryData[]): Promise<void> {
    await prisma.category.createMany({ data });
  }

  @LatencyHistogram('db_category')
  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    return prisma.category.update({ where: { id }, data });
  }

  @LatencyHistogram('db_category')
  async delete(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }

  @LatencyHistogram('db_category')
  async hasTransactions(categoryId: string): Promise<boolean> {
    const count = await prisma.transaction.count({ where: { categoryId } });
    return count > 0;
  }
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(categories): add category entity and repository"
```

---

### Task 3.2: Create categories application layer

**Files:**
- Create: `api/src/modules/categories/application/category.service.ts`

**Step 1: Create api/src/modules/categories/application/category.service.ts**

```typescript
import { CategoryRepository } from '../domain/category.repository.js';
import { Category, DEFAULT_CATEGORIES, CreateCategoryData, UpdateCategoryData } from '../domain/category.entity.js';
import { logger } from '../../../shared/logger/index.js';

export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async createDefaultCategories(userId: string): Promise<void> {
    const categories: CreateCategoryData[] = DEFAULT_CATEGORIES.map((cat) => ({
      userId,
      name: cat.name,
      icon: cat.icon,
      isDefault: true,
    }));

    await this.categoryRepository.createMany(categories);
    logger.info('Default categories created', { userId });
  }

  async getAll(userId: string): Promise<Category[]> {
    return this.categoryRepository.findByUserId(userId);
  }

  async create(userId: string, name: string, icon?: string): Promise<Category> {
    const existing = await this.categoryRepository.findByUserIdAndName(userId, name);
    if (existing) {
      throw new Error('Category already exists');
    }

    const category = await this.categoryRepository.create({
      userId,
      name,
      icon,
      isDefault: false,
    });

    logger.info('Category created', { categoryId: category.id, name });
    return category;
  }

  async update(userId: string, categoryId: string, data: UpdateCategoryData): Promise<Category> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new Error('Category not found');
    }

    if (data.name) {
      const existing = await this.categoryRepository.findByUserIdAndName(userId, data.name);
      if (existing && existing.id !== categoryId) {
        throw new Error('Category with this name already exists');
      }
    }

    const updated = await this.categoryRepository.update(categoryId, data);
    logger.info('Category updated', { categoryId });
    return updated;
  }

  async delete(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new Error('Category not found');
    }

    const hasTransactions = await this.categoryRepository.hasTransactions(categoryId);
    if (hasTransactions) {
      throw new Error('Cannot delete category with transactions');
    }

    await this.categoryRepository.delete(categoryId);
    logger.info('Category deleted', { categoryId });
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat(categories): add category service"
```

---

### Task 3.3: Create categories API layer

**Files:**
- Create: `api/src/modules/categories/api/category.dto.ts`
- Create: `api/src/modules/categories/api/category.controller.ts`
- Create: `api/src/modules/categories/api/category.routes.ts`

**Step 1: Create api/src/modules/categories/api/category.dto.ts**

```typescript
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(10).optional(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
```

**Step 2: Create api/src/modules/categories/api/category.controller.ts**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { CategoryService } from '../application/category.service.js';
import { createCategorySchema, updateCategorySchema } from './category.dto.js';
import { logger } from '../../../shared/logger/index.js';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const categories = await this.categoryService.getAll(userId);
    reply.send(categories);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const result = createCategorySchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const category = await this.categoryService.create(userId, result.data.name, result.data.icon);
      reply.status(201).send(category);
    } catch (error) {
      if (error instanceof Error && error.message === 'Category already exists') {
        reply.status(409).send({ error: error.message });
        return;
      }
      logger.error('Failed to create category', { error });
      reply.status(500).send({ error: 'Failed to create category' });
    }
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const categoryId = request.params.id;
    const result = updateCategorySchema.safeParse(request.body);

    if (!result.success) {
      reply.status(400).send({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }

    try {
      const category = await this.categoryService.update(userId, categoryId, result.data);
      reply.send(category);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
        if (error.message === 'Category with this name already exists') {
          reply.status(409).send({ error: error.message });
          return;
        }
      }
      logger.error('Failed to update category', { error });
      reply.status(500).send({ error: 'Failed to update category' });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;
    const categoryId = request.params.id;

    try {
      await this.categoryService.delete(userId, categoryId);
      reply.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          reply.status(404).send({ error: error.message });
          return;
        }
        if (error.message === 'Cannot delete category with transactions') {
          reply.status(409).send({ error: error.message });
          return;
        }
      }
      logger.error('Failed to delete category', { error });
      reply.status(500).send({ error: 'Failed to delete category' });
    }
  }
}
```

**Step 3: Create api/src/modules/categories/api/category.routes.ts**

```typescript
import { FastifyInstance } from 'fastify';
import { CategoryController } from './category.controller.js';
import { CategoryService } from '../application/category.service.js';
import { PrismaCategoryRepository } from '../infrastructure/category.repository.prisma.js';
import { authMiddleware } from '../../../shared/middleware/auth.js';

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  const categoryRepository = new PrismaCategoryRepository();
  const categoryService = new CategoryService(categoryRepository);
  const controller = new CategoryController(categoryService);

  app.get('/api/categories', { preHandler: authMiddleware }, controller.getAll.bind(controller));
  app.post('/api/categories', { preHandler: authMiddleware }, controller.create.bind(controller));
  app.put('/api/categories/:id', { preHandler: authMiddleware }, controller.update.bind(controller));
  app.delete('/api/categories/:id', { preHandler: authMiddleware }, controller.delete.bind(controller));
}

export { CategoryService } from '../application/category.service.js';
export { PrismaCategoryRepository } from '../infrastructure/category.repository.prisma.js';
```

**Step 4: Register routes in app.ts**

Add to imports:
```typescript
import { categoryRoutes } from './modules/categories/api/category.routes.js';
```

Add after authRoutes:
```typescript
await categoryRoutes(app);
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat(categories): add category controller and routes"
```

---

## Phase 4-7: Remaining Modules

The remaining phases follow the same pattern:

**Phase 4: Budgets Module** - Create domain/infrastructure/application/api layers for budgets and budget_limits
**Phase 5: Transactions Module** - Create transaction CRUD with category spending calculation and RabbitMQ event publishing
**Phase 6: Goals Module** - Create goals with deposit functionality and event publishing
**Phase 7: Notifications Module** - Create notification settings CRUD and Telegram linking

Each task follows TDD: write failing test → implement → verify → commit.

---

## Phase 8: Docker Setup

### Task 8.1: Create API Dockerfile

**Files:**
- Create: `api/Dockerfile`

**Step 1: Create api/Dockerfile**

```dockerfile
# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
RUN bunx prisma generate

# Production stage
FROM oven/bun:1-alpine
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/sh -D appuser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["bun", "dist/main.js"]
```

**Step 2: Commit**

```bash
git add .
git commit -m "chore: add api dockerfile with multi-stage build"
```

---

### Task 8.2: Create Notifications Dockerfile

**Files:**
- Create: `notifications/Dockerfile`

Similar structure to API Dockerfile.

---

### Task 8.3: Create nginx configuration

**Files:**
- Create: `nginx/Dockerfile`
- Create: `nginx/nginx.conf`

**Step 1: Create nginx/nginx.conf**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    server {
        listen 80;

        location /health {
            return 200 'ok';
            add_header Content-Type text/plain;
        }

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Correlation-ID $request_id;
        }
    }
}
```

**Step 2: Create nginx/Dockerfile**

```dockerfile
FROM nginx:alpine
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/sh -D appuser
COPY nginx.conf /etc/nginx/nginx.conf
RUN chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx
USER appuser
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
```

**Step 3: Commit**

```bash
git add .
git commit -m "chore: add nginx configuration"
```

---

### Task 8.4: Create docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    user: "1000:1000"
    environment:
      POSTGRES_USER: ${DB_USER:-budget}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-budget}
      POSTGRES_DB: ${DB_NAME:-budget_app}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-budget}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal

  rabbitmq:
    image: rabbitmq:4-alpine
    user: "1000:1000"
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-budget}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-budget}
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  api:
    build: ./api
    user: "1000:1000"
    environment:
      DATABASE_URL: postgresql://${DB_USER:-budget}:${DB_PASSWORD:-budget}@postgres:5432/${DB_NAME:-budget_app}
      RABBITMQ_URL: amqp://${RABBITMQ_USER:-budget}:${RABBITMQ_PASSWORD:-budget}@rabbitmq:5672
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      PORT: 3000
      BUN_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    networks:
      - internal

  notifications:
    build: ./notifications
    user: "1000:1000"
    environment:
      DATABASE_URL: postgresql://${DB_USER:-budget}:${DB_PASSWORD:-budget}@postgres:5432/${DB_NAME:-budget_app}
      RABBITMQ_URL: amqp://${RABBITMQ_USER:-budget}:${RABBITMQ_PASSWORD:-budget}@rabbitmq:5672
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      PORT: 3001
      BUN_ENV: production
    depends_on:
      rabbitmq:
        condition: service_healthy
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    networks:
      - internal

  nginx:
    build: ./nginx
    user: "1000:1000"
    ports:
      - "80:80"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    networks:
      - internal

volumes:
  postgres_data:

networks:
  internal:
    driver: bridge
```

**Step 2: Commit**

```bash
git add .
git commit -m "chore: add docker-compose configuration"
```

---

## Phase 9: Swagger Documentation

### Task 9.1: Setup Swagger

**Files:**
- Modify: `api/src/app.ts`

Add Swagger configuration with all endpoint documentation.

---

## Summary

This plan covers:
1. Project setup with monorepo structure
2. All required middleware (correlation-id, request counter)
3. Latency histogram decorator
4. Config module with env validation
5. Auth module with JWT
6. Categories, Budgets, Transactions, Goals modules
7. RabbitMQ event publishing
8. Docker setup with all requirements
9. Tests with 40%+ coverage target
10. Swagger documentation

Total estimated tasks: ~50 bite-sized steps across 9 phases.
