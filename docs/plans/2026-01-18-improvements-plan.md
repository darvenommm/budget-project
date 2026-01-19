# План улучшений Budget App

**Дата:** 2026-01-18
**Статус:** Ожидает утверждения

---

## Резюме анализа

Проект реализует микросервисную архитектуру для управления личным бюджетом с Telegram уведомлениями. Основная идея реализована корректно, но есть проблемы в обработке ошибок, тестировании и надёжности межсервисной коммуникации.

**Сильные стороны:**
- Чистая DDD-архитектура в API сервисе
- Database-per-service паттерн
- Асинхронная коммуникация через RabbitMQ
- Correlation ID для трассировки
- Zod валидация
- Non-root пользователи в Docker

---

## Задачи

### 1. Создать иерархию ошибок
**Файлы:** `api/src/shared/errors/`

```typescript
// api/src/shared/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, 409, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: string, message: string) {
    super(code, 401, message);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, public details?: unknown) {
    super(code, 400, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(code: string, message: string) {
    super(code, 503, message);
  }
}
```

**Действия:**
- Создать файл с классами ошибок
- Обновить все сервисы для использования типизированных ошибок
- Обновить все контроллеры для обработки типизированных ошибок
- Обновить глобальный error handler в app.ts

---

### 2. Добавить prefetch и timeout в RabbitMQ consumer
**Файл:** `notifications/src/rabbitmq/consumer.ts`

```typescript
const HANDLER_TIMEOUT = 30000;

export async function connectRabbitMQ(): Promise<void> {
  // ... existing connection code ...

  await channel.prefetch(1);  // Добавить после createChannel()

  // ... rest of code ...
}

async function handleMessage(msg: ConsumeMessage | null): Promise<void> {
  if (!msg || !channel) return;

  try {
    const event = JSON.parse(msg.content.toString()) as BudgetEvent;

    await Promise.race([
      eventHandler(event),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Handler timeout')), HANDLER_TIMEOUT)
      )
    ]);

    channel.ack(msg);
  } catch (error) {
    logger.error('Message handling failed', { error });
    channel.nack(msg, false, true);  // requeue for retry
  }
}
```

---

### 3. Добавить security headers в NGINX
**Файл:** `nginx/nginx.conf`

```nginx
server {
    listen 80;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Request limits
    client_max_body_size 10M;
    client_body_timeout 30s;
    client_header_timeout 30s;

    # ... existing locations ...
}
```

---

### 4. Исправить silent failures в RabbitMQ publish
**Файл:** `api/src/shared/rabbitmq/index.ts`

```typescript
export async function publishEvent(event: BudgetEvent): Promise<void> {
  if (!channel) {
    logger.error('RabbitMQ channel unavailable, event lost', { event });
    return;
  }

  try {
    channel.publish(
      EXCHANGE_NAME,
      '',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    logger.info('Event published', { type: event.type });
  } catch (error) {
    logger.error('Failed to publish event', { error, event });
    throw error;
  }
}
```

---

### 5. Добавить .dockerignore
**Файл:** `.dockerignore` (корень проекта)

```
node_modules
dist
coverage
.git
.env
.env.*
*.log
.prisma
*.md
tests
.eslintcache
.vscode
```

---

### 6. Добавить rate limiting в NGINX
**Файл:** `nginx/nginx.conf`

```nginx
http {
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    server {
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://api:3000;
        }

        location /api/ {
            limit_req zone=general burst=20 nodelay;
            proxy_pass http://api:3000;
        }
    }
}
```

---

### 7. Исправить Telegram error handling
**Файл:** `notifications/src/telegram/telegram.service.ts`

```typescript
export async function sendMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      logger.error('Telegram API error', { status: response.status, error: errorBody });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Telegram request failed', { error });
    return false;
  }
}
```

---

### 8. Добавить HTML escaping в форматтеры
**Файл:** `notifications/src/telegram/formatters.ts`

```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatLimitExceeded(
  categoryName: string,
  spent: number,
  limit: number
): string {
  const percentage = ((spent / limit) * 100).toFixed(0);
  return `<b>⚠️ Лимит превышен!</b>

Категория: ${escapeHtml(categoryName)}
Потрачено: ${spent.toFixed(2)}
Лимит: ${limit.toFixed(2)}
Превышение: ${percentage}%`;
}

export function formatGoalReached(goalName: string, targetAmount: number): string {
  return `<b>🎉 Цель достигнута!</b>

Цель: ${escapeHtml(goalName)}
Сумма: ${targetAmount.toFixed(2)}`;
}
```

---

### 9. Исправить создание сервиса на каждый запрос
**Файл:** `notifications/src/settings/settings.routes.ts`

```typescript
import { SettingsService } from './settings.service';

const settingsService = new SettingsService();

export function settingsRoutes(app: FastifyInstance): void {
  app.get('/settings', async (request, reply) => {
    const userId = request.user!.id;
    const settings = await settingsService.getOrCreate(userId);
    reply.send(settings);
  });

  // ... остальные роуты используют тот же settingsService
}
```

---

### 10. Улучшить health checks
**Файлы:** `notifications/src/main.ts`, `api/src/app.ts`

```typescript
// notifications/src/main.ts
import { isRabbitMQConnected } from './rabbitmq/consumer';
import { prisma } from './shared/database';

app.get('/health', async (request, reply) => {
  const checks = {
    rabbitmq: isRabbitMQConnected(),
    database: await prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false),
  };

  const healthy = Object.values(checks).every(Boolean);

  reply.status(healthy ? 200 : 503).send({
    status: healthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

**Действия:**
- Добавить функцию `isRabbitMQConnected()` в consumer.ts
- Обновить health endpoint в notifications
- Обновить health endpoint в api (добавить проверку БД и RabbitMQ)

---

### 11. Добавить resource limits в docker-compose
**Файл:** `docker-compose.yml`

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M

  notifications:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M

  postgres-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  postgres-notifications:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  rabbitmq:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:
```

---

### 12. Автоматический запуск миграций
**Файлы:** `api/docker-entrypoint.sh`, `api/Dockerfile`, `notifications/docker-entrypoint.sh`, `notifications/Dockerfile`

```bash
#!/bin/sh
# docker-entrypoint.sh
set -e

echo "Waiting for database..."
sleep 2

echo "Running database migrations..."
bunx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting application..."
exec bun run dist/main.js
```

```dockerfile
# Добавить в Dockerfile
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
```

---

### 13. Добавить интеграционные тесты

**Файлы:**
- `api/tests/integration/auth-flow.spec.ts`
- `api/tests/integration/transactions.spec.ts`
- `api/tests/integration/budgets.spec.ts`
- `api/tests/integration/goals.spec.ts`
- `notifications/tests/integration/event-processing.spec.ts`

```typescript
// api/tests/integration/auth-flow.spec.ts
describe('Auth Flow', () => {
  let container: StartedPostgreSqlContainer;
  let app: FastifyInstance;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    // Apply migrations, build app
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it('should complete full auth flow: register -> login -> refresh', async () => {
    // Register
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@test.com', password: 'password123' }
    });
    expect(register.statusCode).toBe(201);

    // Login
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@test.com', password: 'password123' }
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toHaveProperty('accessToken');
    expect(login.json()).toHaveProperty('refreshToken');

    // Use token
    const { accessToken, refreshToken } = login.json();
    const budgets = await app.inject({
      method: 'GET',
      url: '/api/budgets',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    expect(budgets.statusCode).toBe(200);

    // Refresh
    const refresh = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken }
    });
    expect(refresh.statusCode).toBe(200);
  });

  it('should return 401 without token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/transactions'
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 400 for invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'invalid-email', password: 'password123' }
    });
    expect(response.statusCode).toBe(400);
  });
});
```

---

### 14. Добавить unit тесты контроллеров

**Файлы:**
- `api/tests/unit/controllers/auth.controller.spec.ts`
- `api/tests/unit/controllers/transaction.controller.spec.ts`
- `api/tests/unit/controllers/budget.controller.spec.ts`
- `api/tests/unit/controllers/category.controller.spec.ts`
- `api/tests/unit/controllers/goal.controller.spec.ts`

```typescript
// api/tests/unit/controllers/transaction.controller.spec.ts
describe('TransactionController', () => {
  let controller: TransactionController;
  let mockService: jest.Mocked<TransactionService>;
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    mockService = {
      create: jest.fn(),
      getAll: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    controller = new TransactionController(mockService);

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;
  });

  describe('create', () => {
    it('should return 400 for negative amount', async () => {
      mockRequest = {
        user: { id: 'user-id' },
        body: { amount: -100, type: 'EXPENSE', categoryId: 'uuid' }
      } as any;

      await controller.create(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Validation failed' })
      );
    });

    it('should return 201 for valid transaction', async () => {
      mockRequest = {
        user: { id: 'user-id' },
        body: {
          amount: 100,
          type: 'EXPENSE',
          categoryId: 'valid-uuid',
          date: '2026-01-18'
        }
      } as any;

      mockService.create.mockResolvedValue({ id: 'tx-id', ...mockRequest.body });

      await controller.create(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
    });
  });
});
```

---

### 15. Извлечь валидацию в middleware
**Файл:** `api/src/shared/middleware/validation.ts`

```typescript
import { ZodSchema } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten(),
      });
      return reply;
    }
    (request as any).validatedBody = result.data;
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      reply.status(400).send({
        error: 'Invalid parameters',
        code: 'INVALID_PARAMS',
        details: result.error.flatten(),
      });
      return reply;
    }
    (request as any).validatedParams = result.data;
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      reply.status(400).send({
        error: 'Invalid query parameters',
        code: 'INVALID_QUERY',
        details: result.error.flatten(),
      });
      return reply;
    }
    (request as any).validatedQuery = result.data;
  };
}
```

**Использование в роутах:**
```typescript
app.post('/transactions', {
  preValidation: [authMiddleware, validateBody(createTransactionSchema)],
  handler: async (request, reply) => {
    const data = (request as any).validatedBody;
    // ...
  },
});
```

---

### 16. Добавить Repository Pattern в Notifications
**Файлы:**
- `notifications/src/settings/domain/settings.repository.interface.ts`
- `notifications/src/settings/infrastructure/prisma-settings.repository.ts`

```typescript
// notifications/src/settings/domain/settings.repository.interface.ts
export interface NotificationSettings {
  id: string;
  userId: string;
  telegramChatId: string | null;
  notifyLimitExceeded: boolean;
  notifyGoalReached: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettingsRepository {
  findByUserId(userId: string): Promise<NotificationSettings | null>;
  create(userId: string): Promise<NotificationSettings>;
  update(userId: string, data: Partial<NotificationSettings>): Promise<NotificationSettings>;
  upsert(userId: string, data: Partial<NotificationSettings>): Promise<NotificationSettings>;
}
```

```typescript
// notifications/src/settings/infrastructure/prisma-settings.repository.ts
import { prisma } from '../../shared/database';
import { ISettingsRepository, NotificationSettings } from '../domain/settings.repository.interface';

export class PrismaSettingsRepository implements ISettingsRepository {
  async findByUserId(userId: string): Promise<NotificationSettings | null> {
    return prisma.notificationSettings.findUnique({ where: { userId } });
  }

  async create(userId: string): Promise<NotificationSettings> {
    return prisma.notificationSettings.create({
      data: { userId },
    });
  }

  async update(userId: string, data: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return prisma.notificationSettings.update({
      where: { userId },
      data,
    });
  }

  async upsert(userId: string, data: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
```

---

### 17. Добавить gzip в NGINX
**Файл:** `nginx/nginx.conf`

```nginx
http {
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
}
```

---

### 18. Увеличить coverage threshold
**Файл:** `api/jest.config.js`

```javascript
module.exports = {
  // ... existing config ...
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

---

### 19. Добавить retry логику в Telegram
**Файл:** `notifications/src/telegram/telegram.service.ts`

```typescript
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendMessageWithRetry(
  chatId: string,
  text: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const success = await sendMessage(chatId, text);
    if (success) return true;

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      logger.warn(`Telegram send failed, retrying in ${delay}ms`, { attempt, chatId });
      await sleep(delay);
    }
  }

  logger.error('Telegram send failed after all retries', { chatId, maxRetries });
  return false;
}
```

---

### 20. Добавить event versioning
**Файл:** `api/src/shared/rabbitmq/events.ts`

```typescript
export interface BaseEvent {
  version: number;
  timestamp: string;
  correlationId?: string;
}

export interface TransactionCreatedEventV1 extends BaseEvent {
  type: 'TRANSACTION_CREATED';
  version: 1;
  payload: {
    transactionId: string;
    userId: string;
    categoryId: string;
    amount: number;
    transactionType: 'INCOME' | 'EXPENSE';
  };
}

export interface GoalDepositEventV1 extends BaseEvent {
  type: 'GOAL_DEPOSIT';
  version: 1;
  payload: {
    goalId: string;
    userId: string;
    depositAmount: number;
    currentAmount: number;
    targetAmount: number;
  };
}

export type BudgetEvent = TransactionCreatedEventV1 | GoalDepositEventV1;

// В consumer добавить обработку версий
export function handleEvent(event: BudgetEvent): void {
  switch (event.type) {
    case 'TRANSACTION_CREATED':
      if (event.version === 1) {
        handleTransactionCreatedV1(event);
      }
      break;
    // ...
  }
}
```

---

### 21. Добавить unit тесты для Notifications сервиса

**Файлы:**
- `notifications/tests/unit/handlers/transaction-created.spec.ts`
- `notifications/tests/unit/handlers/goal-deposit.spec.ts`
- `notifications/tests/unit/telegram/telegram.service.spec.ts`

```typescript
// notifications/tests/unit/handlers/transaction-created.spec.ts
describe('handleTransactionCreated', () => {
  let mockSettingsRepo: jest.Mocked<ISettingsRepository>;
  let mockTelegramService: jest.Mocked<typeof telegramService>;

  beforeEach(() => {
    mockSettingsRepo = {
      findByUserId: jest.fn(),
    } as any;
  });

  it('should send notification when limit exceeded and notifications enabled', async () => {
    mockSettingsRepo.findByUserId.mockResolvedValue({
      userId: 'user-1',
      telegramChatId: '12345',
      notifyLimitExceeded: true,
    });

    const event = {
      type: 'TRANSACTION_CREATED',
      payload: { userId: 'user-1', amount: 150, categoryId: 'cat-1' }
    };

    await handleTransactionCreated(event);

    expect(mockTelegramService.sendMessage).toHaveBeenCalled();
  });

  it('should not send notification when notifications disabled', async () => {
    mockSettingsRepo.findByUserId.mockResolvedValue({
      userId: 'user-1',
      telegramChatId: '12345',
      notifyLimitExceeded: false,
    });

    const event = {
      type: 'TRANSACTION_CREATED',
      payload: { userId: 'user-1', amount: 150, categoryId: 'cat-1' }
    };

    await handleTransactionCreated(event);

    expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
  });
});
```

---

### 22. Оптимизировать Dockerfile

**Файлы:** `api/Dockerfile`, `notifications/Dockerfile`

```dockerfile
# Используем alpine для builder тоже
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Копируем только файлы зависимостей для кэширования
COPY package.json bun.lock ./
COPY api/package.json ./api/

# Устанавливаем только production зависимости
RUN bun install --frozen-lockfile

# Копируем исходники
COPY api/ ./api/
COPY tsconfig.base.json ./

# Генерируем Prisma client
RUN cd api && bunx prisma generate

# Собираем приложение
RUN cd api && bun build src/main.ts --outdir=dist --target=bun

# Production stage
FROM oven/bun:1-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

# Создаём non-root пользователя
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser

# Копируем только необходимое
COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/api/prisma ./prisma
COPY --from=builder /app/api/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/api/package.json ./

# Entrypoint для миграций
COPY api/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
```

---

### 23. Добавить graceful shutdown с drain

**Файлы:** `notifications/src/main.ts`, `api/src/main.ts`

```typescript
// notifications/src/main.ts
let isShuttingDown = false;
let activeHandlers = 0;

export function incrementActiveHandlers(): void {
  activeHandlers++;
}

export function decrementActiveHandlers(): void {
  activeHandlers--;
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new messages
  await stopConsumer();

  // Wait for active handlers to complete (max 30s)
  const maxWait = 30000;
  const startTime = Date.now();

  while (activeHandlers > 0 && Date.now() - startTime < maxWait) {
    logger.info(`Waiting for ${activeHandlers} active handlers to complete`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (activeHandlers > 0) {
    logger.warn(`Force shutdown with ${activeHandlers} active handlers`);
  }

  // Close connections
  await app.close();
  await disconnectRabbitMQ();
  await disconnectDatabase();

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## Чеклист выполнения

- [ ] 1. Создать иерархию ошибок
- [ ] 2. Добавить prefetch и timeout в RabbitMQ consumer
- [ ] 3. Добавить security headers в NGINX
- [ ] 4. Исправить silent failures в RabbitMQ publish
- [ ] 5. Добавить .dockerignore
- [ ] 6. Добавить rate limiting в NGINX
- [ ] 7. Исправить Telegram error handling
- [ ] 8. Добавить HTML escaping в форматтеры
- [ ] 9. Исправить создание сервиса на каждый запрос
- [ ] 10. Улучшить health checks
- [ ] 11. Добавить resource limits в docker-compose
- [ ] 12. Автоматический запуск миграций
- [ ] 13. Добавить интеграционные тесты
- [ ] 14. Добавить unit тесты контроллеров
- [ ] 15. Извлечь валидацию в middleware
- [ ] 16. Добавить Repository Pattern в Notifications
- [ ] 17. Добавить gzip в NGINX
- [ ] 18. Увеличить coverage threshold
- [ ] 19. Добавить retry логику в Telegram
- [ ] 20. Добавить event versioning
- [ ] 21. Добавить unit тесты для Notifications сервиса
- [ ] 22. Оптимизировать Dockerfile
- [ ] 23. Добавить graceful shutdown с drain

---

## Метрики успеха

| Метрика | Текущее | Цель |
|---------|---------|------|
| Test coverage | 40% | 80% |
| Unit тесты | 11 | 50+ |
| Integration тесты | 2 | 20+ |
| Security headers | 0 | 5+ |
| Типизированные ошибки | 0% | 100% |
