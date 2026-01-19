# Integration Tests Node.js Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Разделить запуск тестов: unit-тесты через Bun, интеграционные тесты через Node.js + Jest с полной поддержкой Testcontainers.

**Architecture:** Создать отдельные конфигурации для unit и integration тестов. Unit тесты остаются на Bun (быстрые, без внешних зависимостей). Интеграционные тесты переходят на Jest/Node.js где Testcontainers и `supertest` работают корректно.

**Tech Stack:** Jest 29, ts-jest, Node.js, Testcontainers, supertest

---

## Task 1: Создание конфигурации Jest для интеграционных тестов

**Files:**
- Create: `api/jest.integration.config.js`
- Modify: `api/jest.config.js` (исключить integration тесты)

**Step 1: Создать jest.integration.config.js**

```javascript
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testTimeout: 120000,
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
  testMatch: ['**/tests/integration/**/*.spec.ts'],
  maxWorkers: 1, // Run sequentially to avoid container conflicts
};
```

**Step 2: Обновить jest.config.js для исключения integration тестов**

Добавить в существующий конфиг:
```javascript
testPathIgnorePatterns: ['<rootDir>/tests/integration/'],
```

**Step 3: Verify конфиг создан**

Run: `ls -la api/jest.integration.config.js`
Expected: файл существует

---

## Task 2: Создание setup файла для интеграционных тестов

**Files:**
- Create: `api/tests/setup.integration.ts`

**Step 1: Создать setup.integration.ts**

```typescript
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
```

**Step 2: Verify файл создан**

Run: `ls -la api/tests/setup.integration.ts`
Expected: файл существует

---

## Task 3: Обновление testcontainers.ts для Node.js

**Files:**
- Modify: `api/tests/testcontainers.ts`

**Step 1: Упростить testcontainers.ts (убрать Docker Compose fallback)**

Testcontainers будут работать нативно с Node.js, поэтому Docker Compose fallback больше не нужен. Заменить содержимое на:

```typescript
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
```

**Step 2: Verify изменения**

Run: `cat api/tests/testcontainers.ts | head -20`
Expected: начало файла без Docker Compose логики

---

## Task 4: Миграция интеграционных тестов на Jest globals

**Files:**
- Modify: `api/tests/integration/health.spec.ts`
- Modify: `api/tests/integration/auth-flow.spec.ts`
- Modify: `api/tests/integration/budgets.spec.ts`
- Modify: `api/tests/integration/goals.spec.ts`
- Modify: `api/tests/integration/transactions.spec.ts`

**Step 1: Обновить health.spec.ts**

Заменить импорт:
```typescript
// Было:
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

// Стало:
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
```

Убрать setup/teardown контейнеров (они теперь в setup.integration.ts):

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should return 200 with status ok', async () => {
    const response = await supertest(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });

  it('should include correlation-id header in response', async () => {
    const response = await supertest(app.server)
      .get('/health')
      .set('x-correlation-id', 'test-correlation-id');

    expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
  });
});
```

**Step 2: Обновить auth-flow.spec.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { buildApp } from '../../src/app.js';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

describe('Auth Flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app?.close();
  });

  // ... остальные тесты без изменений
});
```

**Step 3: Аналогично обновить остальные файлы**

- `budgets.spec.ts`
- `goals.spec.ts`
- `transactions.spec.ts`

Паттерн одинаковый:
1. Заменить `from 'bun:test'` на `from '@jest/globals'`
2. Убрать `startContainers/stopContainers`, `connectDatabase/disconnectDatabase`, `connectRabbitMQ/disconnectRabbitMQ` из локальных `beforeAll/afterAll`
3. Оставить только создание `app` и `app.listen/close`

---

## Task 5: Обновление package.json scripts

**Files:**
- Modify: `api/package.json`

**Step 1: Обновить scripts секцию**

```json
{
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target bun --external @prisma/client",
    "start": "bun dist/main.js",
    "test": "bun run test:unit && npm run test:integration",
    "test:unit": "bun test tests/unit",
    "test:integration": "NODE_OPTIONS='--experimental-vm-modules' npx jest --config jest.integration.config.js",
    "test:cov": "bun test tests/unit --coverage",
    "test:integration:cov": "NODE_OPTIONS='--experimental-vm-modules' npx jest --config jest.integration.config.js --coverage",
    "db:migrate": "bunx prisma migrate dev",
    "db:generate": "bunx prisma generate"
  }
}
```

**Step 2: Verify scripts обновлены**

Run: `cat api/package.json | grep -A 15 '"scripts"'`
Expected: новые scripts присутствуют

---

## Task 6: Обновление setup.ts для unit тестов

**Files:**
- Modify: `api/tests/setup.ts`

**Step 1: Упростить setup.ts для unit тестов**

Unit тесты не требуют реальных контейнеров - они используют моки:

```typescript
// Set test environment variables for unit tests
// These are mocked in tests, actual values don't matter
process.env.NODE_ENV = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-min-32-characters-long';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-min-32-characters-long';
process.env['RABBITMQ_URL'] = 'amqp://test:test@localhost:5672';
```

**Step 2: Verify изменения**

Run: `cat api/tests/setup.ts`
Expected: упрощённый setup без bun:test импортов

---

## Task 7: Верификация - запуск unit тестов

**Files:** None (verification only)

**Step 1: Запустить unit тесты через Bun**

Run: `cd api && bun run test:unit`
Expected: все unit тесты проходят

**Step 2: Commit прогресса**

```bash
git add api/jest.config.js api/tests/setup.ts
git commit -m "chore: separate unit tests config for Bun runtime"
```

---

## Task 8: Верификация - запуск интеграционных тестов

**Files:** None (verification only)

**Step 1: Запустить интеграционные тесты через Jest/Node.js**

Run: `cd api && npm run test:integration`
Expected: Testcontainers запускаются, тесты проходят

**Step 2: Commit финальных изменений**

```bash
git add .
git commit -m "feat: migrate integration tests to Node.js + Jest

- Add jest.integration.config.js for integration tests
- Add setup.integration.ts with Testcontainers setup
- Migrate integration tests from bun:test to @jest/globals
- Simplify testcontainers.ts (remove Docker Compose fallback)
- Update package.json with separate test commands

Fixes #INTEGRATION_BUG - Bun + Fastify inject() compatibility issue

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Обновление документации

**Files:**
- Modify: `docs/INTEGRATION_BUG.md`

**Step 1: Обновить статус бага**

Добавить в начало файла:
```markdown
**Status:** Resolved
**Resolution Date:** 2026-01-19
**Solution:** Migrated integration tests to Node.js + Jest
```

Обновить секцию Resolution:
```markdown
## Resolution

Интеграционные тесты перенесены на Node.js + Jest runtime:

- Unit тесты: `bun run test:unit` (Bun runtime)
- Integration тесты: `npm run test:integration` (Node.js + Jest)

Testcontainers работают корректно с Node.js. Проблема несовместимости Bun + Fastify `inject()` обходится за счёт использования Node.js для интеграционных тестов.
```

**Step 2: Commit документации**

```bash
git add docs/INTEGRATION_BUG.md
git commit -m "docs: mark integration tests bug as resolved"
```

---

## Summary

| Task | Описание | Файлы |
|------|----------|-------|
| 1 | Jest config для интеграционных тестов | `jest.integration.config.js`, `jest.config.js` |
| 2 | Setup файл для интеграционных тестов | `setup.integration.ts` |
| 3 | Упрощение testcontainers.ts | `testcontainers.ts` |
| 4 | Миграция тестов на Jest globals | 5 `.spec.ts` файлов |
| 5 | Обновление package.json scripts | `package.json` |
| 6 | Упрощение setup.ts для unit тестов | `setup.ts` |
| 7 | Верификация unit тестов | - |
| 8 | Верификация интеграционных тестов | - |
| 9 | Обновление документации | `INTEGRATION_BUG.md` |

**Ожидаемый результат:**
- Unit тесты работают через Bun (быстро)
- Интеграционные тесты работают через Node.js + Jest с Testcontainers
- Полная совместимость без workaround-ов
