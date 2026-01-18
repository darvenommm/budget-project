# Database Per Service — Полная перестройка

**Дата:** 2026-01-17
**Статус:** Утверждён

## Цель

Полная перестройка Prisma конфигурации для архитектуры database-per-service с двумя микросервисами.

## Микросервисы и владение данными

| Сервис | База данных | Таблицы |
|--------|-------------|---------|
| api | budget_api | users, refresh_tokens, categories, budgets, budget_limits, transactions, goals |
| notifications | budget_notifications | notification_settings |

## Структура файлов

```
project/
├── docker-compose.yml          # 2 PostgreSQL инстанса
├── .env.example                 # Общие переменные
│
├── api/
│   ├── prisma/
│   │   ├── prisma.config.ts    # Конфиг для api
│   │   └── schema.prisma       # users, tokens, categories, budgets, goals, transactions
│   ├── src/
│   │   └── shared/database/    # PrismaClient для api
│   └── package.json
│
├── notifications/
│   ├── prisma/
│   │   ├── prisma.config.ts    # Конфиг для notifications
│   │   └── schema.prisma       # notification_settings
│   ├── src/
│   │   ├── shared/database/    # PrismaClient для notifications
│   │   └── settings/           # API для notification_settings
│   └── package.json
│
└── shared/                      # Удалить (каждый сервис автономен)
```

## Docker Compose

```yaml
services:
  postgres-api:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: budget_api
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_api_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d budget_api"]

  postgres-notifications:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: budget_notifications
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_notifications_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d budget_notifications"]

  api:
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-api:5432/budget_api

  notifications:
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-notifications:5432/budget_notifications
```

## Prisma Configuration

### api/prisma/prisma.config.ts

```typescript
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),

  migrate: {
    async url() {
      return buildUrl();
    },
  },

  studio: {
    async url() {
      return buildUrl();
    },
  },
});

function buildUrl(): string {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'budget';
  const password = process.env.DB_PASSWORD ?? 'budget';
  const database = 'budget_api';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
```

### notifications/prisma/prisma.config.ts

Идентичная структура, `database = 'budget_notifications'`.

## Prisma Schemas

### api/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  refreshTokens RefreshToken[]
  categories    Category[]
  budgets       Budget[]
  goals         Goal[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  token     String   @unique
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model Category {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  userId    String   @map("user_id") @db.Uuid
  isDefault Boolean  @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  budgetLimits BudgetLimit[]
  transactions Transaction[]

  @@unique([userId, name])
  @@map("categories")
}

model Budget {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  month     DateTime @db.Date
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  limits BudgetLimit[]

  @@unique([userId, month])
  @@index([userId])
  @@map("budgets")
}

model BudgetLimit {
  id         String  @id @default(uuid()) @db.Uuid
  budgetId   String  @map("budget_id") @db.Uuid
  categoryId String  @map("category_id") @db.Uuid
  amount     Decimal @db.Decimal(12, 2)

  budget   Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([budgetId, categoryId])
  @@map("budget_limits")
}

enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id          String          @id @default(uuid()) @db.Uuid
  userId      String          @map("user_id") @db.Uuid
  categoryId  String          @map("category_id") @db.Uuid
  type        TransactionType
  amount      Decimal         @db.Decimal(12, 2)
  description String?
  date        DateTime        @db.Date
  createdAt   DateTime        @default(now()) @map("created_at")

  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@index([categoryId])
  @@map("transactions")
}

model Goal {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  name          String
  targetAmount  Decimal  @map("target_amount") @db.Decimal(12, 2)
  currentAmount Decimal  @default(0) @map("current_amount") @db.Decimal(12, 2)
  deadline      DateTime? @db.Date
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("goals")
}
```

### notifications/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model NotificationSettings {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @unique @map("user_id") @db.Uuid
  telegramChatId      String?  @map("telegram_chat_id")
  notifyLimitExceeded Boolean  @default(true) @map("notify_limit_exceeded")
  notifyGoalReached   Boolean  @default(true) @map("notify_goal_reached")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@map("notification_settings")
}
```

## PrismaClient

### api/src/shared/database/index.ts

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('API database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('API database disconnected');
}

export { prisma };
```

### notifications/src/shared/database/index.ts

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('Notifications database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('Notifications database disconnected');
}

export { prisma };
```

## План верификации

### Этап 1: Сборка и генерация
```bash
cd api && bun install && bunx prisma generate
cd notifications && bun install && bunx prisma generate
```
✓ Нет ошибок компиляции TypeScript

### Этап 2: База данных
```bash
docker-compose up -d postgres-api postgres-notifications
cd api && bunx prisma migrate dev --name init
cd notifications && bunx prisma migrate dev --name init
```
✓ Таблицы созданы в правильных базах

### Этап 3: Запуск сервисов
```bash
docker-compose up -d
```
✓ Все контейнеры healthy

### Этап 4: Функциональные тесты
```bash
# Регистрация пользователя (api)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Создание настроек уведомлений (notifications)
curl -X POST http://localhost:8080/api/notifications/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notifyLimitExceeded":true}'
```
✓ API отвечает, данные сохраняются

### Этап 5: Изоляция данных
```bash
docker exec postgres-api psql -U budget -d budget_api -c "\dt"
# Должны быть: users, categories, budgets, budget_limits, transactions, goals, refresh_tokens

docker exec postgres-notifications psql -U budget -d budget_notifications -c "\dt"
# Должна быть только: notification_settings
```
✓ Полная изоляция данных

## Принципы

1. **Автономность** — каждый сервис полностью независим
2. **Изоляция данных** — нет cross-database запросов
3. **Логические связи** — userId в notifications без FK на users
4. **Коммуникация** — между сервисами только через RabbitMQ
