# Database Per Service — План имплементации

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Полная перестройка Prisma конфигурации для изолированных баз данных в каждом микросервисе.

**Architecture:** Два микросервиса (api, notifications), каждый со своим PostgreSQL инстансом, автономным prisma.config.ts и schema.prisma. Удаление shared зависимостей.

**Tech Stack:** Prisma 7.2.0, PostgreSQL 17, Bun, TypeScript, Fastify

---

## Task 1: Остановить все сервисы и очистить артефакты

**Files:**
- Delete: `shared/database.ts`
- Delete: `api/prisma/migrations/` (все содержимое)
- Delete: `notifications/prisma/migrations/` (все содержимое)

**Step 1: Остановить docker-compose**

```bash
cd /home/darvenommm/final-many-project
docker-compose down -v
```

Expected: Все контейнеры остановлены, volumes удалены

**Step 2: Удалить старые миграции и shared**

```bash
rm -rf api/prisma/migrations
rm -rf notifications/prisma/migrations
rm -rf shared
```

Expected: Директории удалены

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up old migrations and shared database"
```

---

## Task 2: Обновить api/prisma/prisma.config.ts

**Files:**
- Modify: `api/prisma/prisma.config.ts`

**Step 1: Переписать prisma.config.ts**

```typescript
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'schema.prisma'),

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

**Step 2: Commit**

```bash
git add api/prisma/prisma.config.ts
git commit -m "feat(api): standalone prisma config for budget_api database"
```

---

## Task 3: Обновить api/prisma/schema.prisma

**Files:**
- Modify: `api/prisma/schema.prisma`

**Step 1: Переписать schema.prisma**

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
  icon      String?
  isDefault Boolean  @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  budgetLimits BudgetLimit[]
  transactions Transaction[]

  @@unique([userId, name])
  @@index([userId])
  @@map("categories")
}

model Budget {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  month     Int
  year      Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  limits BudgetLimit[]

  @@unique([userId, month, year])
  @@index([userId])
  @@map("budgets")
}

model BudgetLimit {
  id          String  @id @default(uuid()) @db.Uuid
  budgetId    String  @map("budget_id") @db.Uuid
  categoryId  String  @map("category_id") @db.Uuid
  limitAmount Decimal @map("limit_amount") @db.Decimal(12, 2)

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
  id            String    @id @default(uuid()) @db.Uuid
  userId        String    @map("user_id") @db.Uuid
  name          String
  targetAmount  Decimal   @map("target_amount") @db.Decimal(12, 2)
  currentAmount Decimal   @default(0) @map("current_amount") @db.Decimal(12, 2)
  deadline      DateTime? @db.Date
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("goals")
}
```

**Step 2: Commit**

```bash
git add api/prisma/schema.prisma
git commit -m "feat(api): improve schema with uuid types and indexes"
```

---

## Task 4: Обновить notifications/prisma/prisma.config.ts

**Files:**
- Modify: `notifications/prisma/prisma.config.ts`

**Step 1: Переписать prisma.config.ts**

```typescript
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'schema.prisma'),

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
  const database = 'budget_notifications';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
```

**Step 2: Commit**

```bash
git add notifications/prisma/prisma.config.ts
git commit -m "feat(notifications): standalone prisma config for budget_notifications database"
```

---

## Task 5: Обновить notifications/prisma/schema.prisma

**Files:**
- Modify: `notifications/prisma/schema.prisma`

**Step 1: Переписать schema.prisma**

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

**Step 2: Commit**

```bash
git add notifications/prisma/schema.prisma
git commit -m "feat(notifications): improve schema with uuid types and timestamps"
```

---

## Task 6: Добавить db:migrate скрипт в notifications/package.json

**Files:**
- Modify: `notifications/package.json`

**Step 1: Добавить скрипт**

В секцию "scripts" добавить:
```json
"db:migrate": "bunx prisma migrate dev"
```

**Step 2: Commit**

```bash
git add notifications/package.json
git commit -m "feat(notifications): add db:migrate script"
```

---

## Task 7: Поднять базы данных и сгенерировать Prisma клиенты

**Step 1: Запустить PostgreSQL контейнеры**

```bash
cd /home/darvenommm/final-many-project
docker-compose up -d postgres-api postgres-notifications
```

Expected: Оба контейнера запущены и healthy

**Step 2: Подождать ready**

```bash
docker-compose ps
```

Expected: postgres-api и postgres-notifications в состоянии healthy

**Step 3: Сгенерировать Prisma клиент для api**

```bash
cd /home/darvenommm/final-many-project/api
bun install
bunx prisma generate
```

Expected: Prisma client generated successfully

**Step 4: Сгенерировать Prisma клиент для notifications**

```bash
cd /home/darvenommm/final-many-project/notifications
bun install
bunx prisma generate
```

Expected: Prisma client generated successfully

---

## Task 8: Применить миграции

**Step 1: Миграция для api**

```bash
cd /home/darvenommm/final-many-project/api
bunx prisma migrate dev --name init
```

Expected: Migration applied, 7 tables created (users, refresh_tokens, categories, budgets, budget_limits, transactions, goals)

**Step 2: Миграция для notifications**

```bash
cd /home/darvenommm/final-many-project/notifications
bunx prisma migrate dev --name init
```

Expected: Migration applied, 1 table created (notification_settings)

**Step 3: Commit миграции**

```bash
cd /home/darvenommm/final-many-project
git add api/prisma/migrations notifications/prisma/migrations
git commit -m "feat: add initial migrations for both services"
```

---

## Task 9: Проверить TypeScript компиляцию

**Step 1: Проверить api**

```bash
cd /home/darvenommm/final-many-project/api
bunx tsc --noEmit
```

Expected: No errors

**Step 2: Проверить notifications**

```bash
cd /home/darvenommm/final-many-project/notifications
bunx tsc --noEmit
```

Expected: No errors

---

## Task 10: Запустить все сервисы

**Step 1: Запустить docker-compose**

```bash
cd /home/darvenommm/final-many-project
docker-compose up -d
```

Expected: Все сервисы запущены

**Step 2: Проверить health**

```bash
docker-compose ps
```

Expected: Все сервисы healthy

**Step 3: Проверить логи**

```bash
docker-compose logs api --tail 20
docker-compose logs notifications --tail 20
```

Expected: "Database connected" в логах обоих сервисов

---

## Task 11: Функциональное тестирование API

**Step 1: Проверить health endpoint**

```bash
curl http://localhost:8080/health
```

Expected: `{"status":"ok"}`

**Step 2: Зарегистрировать пользователя**

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected: JSON с токенами доступа

**Step 3: Проверить notifications health**

```bash
curl http://localhost:8080/api/notifications/health
```

Expected: `{"status":"ok","service":"notifications"}` или аналогичный

---

## Task 12: Проверить изоляцию данных

**Step 1: Проверить таблицы в budget_api**

```bash
docker exec -it $(docker ps -qf "name=postgres-api") \
  psql -U budget -d budget_api -c "\dt"
```

Expected: 7 таблиц (users, refresh_tokens, categories, budgets, budget_limits, transactions, goals, _prisma_migrations)

**Step 2: Проверить таблицы в budget_notifications**

```bash
docker exec -it $(docker ps -qf "name=postgres-notifications") \
  psql -U budget -d budget_notifications -c "\dt"
```

Expected: 2 таблицы (notification_settings, _prisma_migrations)

**Step 3: Убедиться что нет пересечений**

В budget_api НЕ должно быть notification_settings.
В budget_notifications НЕ должно быть users, budgets и т.д.

---

## Task 13: Финальный коммит

**Step 1: Проверить статус**

```bash
git status
```

**Step 2: Коммит если есть изменения**

```bash
git add -A
git commit -m "feat: complete database-per-service architecture

- Separate PostgreSQL instances for api and notifications
- Standalone prisma.config.ts for each service
- Improved schemas with UUID types and indexes
- Verified data isolation"
```

---

## Критерии успеха

- [ ] Оба сервиса запускаются и отвечают на /health
- [ ] API может регистрировать пользователей
- [ ] Notifications имеет свою отдельную таблицу notification_settings
- [ ] Нет cross-database зависимостей
- [ ] TypeScript компилируется без ошибок
- [ ] Все миграции применены успешно
