# Code Style & Quality Improvements Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Привести кодовую базу в соответствие с Google TypeScript Style Guide, убрать eslint-disable комментарии, заменить `.js` расширения на `.ts` в импортах, устранить type casting через `as`, и улучшить качество кода.

**Architecture:** Последовательная миграция по модулям с проверкой линтера после каждого изменения.

**Tech Stack:** TypeScript, ESLint, Fastify, Prisma

---

## Принятые решения

| Вопрос | Решение |
|--------|---------|
| `authMiddleware as never` | B) Добавить правильные generic-типы напрямую |
| Test mocks `as unknown as` | A) Создать mock-фабрики с типизацией |
| JWT `as TokenPayload` | B) Создать type guard функцию |
| Code smells | Все: magic numbers, auth duplication, console.error → logger |

---

## Task 1: Заменить `.js` на `.ts` в импортах

**Files:**
- Modify: Все `*.ts` файлы в `api/src/`, `api/tests/`, `notifications/src/`, `notifications/tests/`

**Step 1: Массовая замена расширений в api**

```bash
find api/src api/tests -name "*.ts" -exec sed -i "s/from '\(\..*\)\.js'/from '\1.ts'/g" {} \;
find api/src api/tests -name "*.ts" -exec sed -i 's/from "\(\..*\)\.js"/from "\1.ts"/g' {} \;
```

**Step 2: Массовая замена расширений в notifications**

```bash
find notifications/src notifications/tests -name "*.ts" -exec sed -i "s/from '\(\..*\)\.js'/from '\1.ts'/g" {} \;
find notifications/src notifications/tests -name "*.ts" -exec sed -i 's/from "\(\..*\)\.js"/from "\1.ts"/g' {} \;
```

**Step 3: Проверить линтером**

```bash
npm run lint
```

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor: change import extensions from .js to .ts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Убрать eslint-disable комментарии

### Task 2.1: Исправить `no-var` в globalSetup.ts ✅ DONE

**Результат:** Обнаружено, что глобальные переменные `__POSTGRES_CONTAINER__` и `__RABBITMQ_CONTAINER__` не использовались (teardown читает из config файла). Удалены неиспользуемые декларации, eslint-disable комментарии убраны.

**Commit:** `6e79905` - refactor: remove unused global declarations from test setup

### Task 2.2: Исправить тесты notifications ✅ DONE

**Files:**
- Modify: `notifications/tests/unit/handlers/goal-deposit.spec.ts`
- Modify: `notifications/tests/unit/handlers/transaction-created.spec.ts`

**Step 1: Прочитать файлы и понять контекст eslint-disable**

**Step 2: Создать правильные типы для mock данных**

Вместо `any` использовать конкретные типы событий.

**Step 3: Проверить тесты**

```bash
cd notifications && bun test
```

**Step 4: Commit**

```bash
git add notifications/tests && git commit -m "refactor: fix type safety in notification tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

### Task 2.3: Удалить интеграционные тесты

**Причина:** Интеграционные тесты требуют Docker containers (PostgreSQL, RabbitMQ) и занимают много времени. Решено удалить их для упрощения CI/CD.

**Files:**
- Delete: `api/tests/integration/` (вся папка)
- Delete: `api/tests/globalSetup.ts`
- Delete: `api/tests/globalTeardown.ts`
- Modify: `api/jest.config.ts` (убрать globalSetup/globalTeardown)
- Modify: `api/package.json` (убрать testcontainers dependencies)

**Step 1: Удалить папку интеграционных тестов**

```bash
rm -rf api/tests/integration
```

**Step 2: Удалить globalSetup.ts и globalTeardown.ts**

```bash
rm api/tests/globalSetup.ts api/tests/globalTeardown.ts
```

**Step 3: Обновить jest.config.ts**

Убрать `globalSetup` и `globalTeardown` из конфига.

**Step 4: Удалить testcontainers из dependencies**

```bash
cd api && npm uninstall @testcontainers/postgresql @testcontainers/rabbitmq testcontainers
```

**Step 5: Удалить config файл если существует**

```bash
rm -f api/.integration-test-config.json
```

**Step 6: Проверить что unit тесты работают**

```bash
cd api && npm test -- --testPathPattern=unit
```

**Step 7: Commit**

```bash
git add -A && git commit -m "chore: remove integration tests

Integration tests required Docker containers and were slow.
Keeping unit tests only for faster CI/CD.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Исправить authMiddleware типизацию

**Files:**
- Modify: `api/src/shared/middleware/auth.ts`
- Modify: `api/src/modules/auth/api/auth.routes.ts`
- Modify: `api/src/modules/budgets/api/budget.routes.ts`
- Modify: `api/src/modules/categories/api/category.routes.ts`
- Modify: `api/src/modules/goals/api/goal.routes.ts`
- Modify: `api/src/modules/transactions/api/transaction.routes.ts`

**Step 1: Прочитать текущую реализацию auth middleware**

**Step 2: Добавить правильные generic типы**

```typescript
import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

export const authMiddleware: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  // ... implementation
};
```

**Step 3: Убрать `as never` из всех route файлов**

```typescript
// Before:
app.get('/api/budgets', { preHandler: authMiddleware as never }, controller.getAll.bind(controller));

// After:
app.get('/api/budgets', { preHandler: authMiddleware }, controller.getAll.bind(controller));
```

**Step 4: Проверить линтером и unit тестами**

```bash
npm run lint
cd api && npm test -- --testPathPattern=unit
```

**Step 5: Commit**

```bash
git add api/src && git commit -m "refactor: fix authMiddleware typing, remove 'as never' casts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Создать mock-фабрики для тестов

**Files:**
- Create: `api/tests/helpers/mock-factories.ts`
- Modify: `api/tests/unit/controllers/*.spec.ts` (5 файлов)

**Step 1: Создать файл с mock-фабриками**

```typescript
// api/tests/helpers/mock-factories.ts
import type { FastifyRequest, FastifyReply } from 'fastify';

interface MockRequestOptions<TBody = unknown, TParams = unknown, TQuery = unknown> {
  body?: TBody;
  params?: TParams;
  query?: TQuery;
  user?: { id: string; email: string };
}

export function createMockRequest<TBody = unknown, TParams = unknown, TQuery = unknown>(
  options: MockRequestOptions<TBody, TParams, TQuery> = {}
): FastifyRequest {
  return {
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
    user: options.user,
  } as FastifyRequest;
}

interface MockReplyMethods {
  status: jest.Mock;
  send: jest.Mock;
  code: jest.Mock;
}

export function createMockReply(): FastifyReply & MockReplyMethods {
  const reply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
  };
  return reply as FastifyReply & MockReplyMethods;
}
```

**Step 2: Обновить auth.controller.spec.ts**

Заменить `as unknown as FastifyRequest` на `createMockRequest()`.

**Step 3: Обновить budget.controller.spec.ts**

**Step 4: Обновить category.controller.spec.ts**

**Step 5: Обновить goal.controller.spec.ts**

**Step 6: Обновить transaction.controller.spec.ts**

**Step 7: Проверить тесты**

```bash
cd api && npm test -- --testPathPattern=unit
```

**Step 8: Commit**

```bash
git add api/tests && git commit -m "refactor: add mock factories for controller tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Создать type guard для JWT

**Files:**
- Modify: `api/src/modules/auth/application/jwt.service.ts`
- Modify: `notifications/src/shared/auth/jwt.service.ts`

**Step 1: Прочитать текущую реализацию**

**Step 2: Добавить type guard функцию**

```typescript
interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

function isTokenPayload(payload: unknown): payload is TokenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    'email' in payload &&
    typeof (payload as TokenPayload).userId === 'string' &&
    typeof (payload as TokenPayload).email === 'string'
  );
}
```

**Step 3: Обновить verify функции**

```typescript
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtConfig.accessSecret);
  if (!isTokenPayload(decoded)) {
    throw new Error('Invalid token payload');
  }
  return decoded;
}
```

**Step 4: Проверить линтером и unit тестами**

```bash
npm run lint
cd api && npm test -- --testPathPattern=unit
```

**Step 5: Commit**

```bash
git add api/src notifications/src && git commit -m "refactor: add type guard for JWT token payload

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Вынести magic numbers в константы

**Files:**
- Create: `api/src/shared/constants/index.ts`
- Create: `notifications/src/shared/constants/index.ts`
- Modify: `api/src/modules/auth/application/jwt.service.ts`
- Modify: `api/src/modules/auth/application/password.service.ts`
- Modify: `api/src/main.ts`
- Modify: `notifications/src/main.ts`
- Modify: `notifications/src/telegram/telegram.service.ts`
- Modify: `notifications/src/rabbitmq/consumer.ts`

**Step 1: Создать файл констант для api**

```typescript
// api/src/shared/constants/index.ts
export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30000;
export const DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes
export const DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const BCRYPT_COST = 10;

export const TIME_MULTIPLIERS_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

export const TIME_MULTIPLIERS_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;
```

**Step 2: Создать файл констант для notifications**

```typescript
// notifications/src/shared/constants/index.ts
export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30000;
export const HANDLER_TIMEOUT_MS = 30000;
export const TELEGRAM_RETRY_BASE_MS = 1000;
```

**Step 3: Обновить jwt.service.ts**

Заменить hardcoded значения на константы.

**Step 4: Обновить password.service.ts**

```typescript
import { BCRYPT_COST } from '../../../shared/constants/index.ts';

const hasher = new Bun.CryptoHasher('bcrypt', { cost: BCRYPT_COST });
```

**Step 5: Обновить main.ts в обоих сервисах**

**Step 6: Обновить telegram.service.ts и consumer.ts**

**Step 7: Проверить линтером и unit тестами**

```bash
npm run lint
cd api && npm test -- --testPathPattern=unit
cd ../notifications && bun test
```

**Step 8: Commit**

```bash
git add -A && git commit -m "refactor: extract magic numbers to constants

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Рефакторинг дублирования auth в контроллерах

**Files:**
- Modify: `api/src/shared/middleware/auth.ts`
- Modify: `api/src/modules/budgets/api/budget.controller.ts`
- Modify: `api/src/modules/categories/api/category.controller.ts`
- Modify: `api/src/modules/goals/api/goal.controller.ts`
- Modify: `api/src/modules/transactions/api/transaction.controller.ts`
- Modify: `api/src/modules/auth/api/auth.controller.ts`

**Step 1: Проверить текущую реализацию getAuthenticatedUser**

**Step 2: Убедиться что helper уже существует и правильно типизирован**

Если helper уже есть, убедиться что он используется везде одинаково.

**Step 3: Проверить линтером**

```bash
npm run lint
```

**Step 4: Commit (если были изменения)**

```bash
git add api/src && git commit -m "refactor: standardize auth user extraction in controllers

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Заменить console.error на logger

**Files:**
- Modify: `api/src/config/env.ts`

**Step 1: Прочитать файл**

**Step 2: Заменить console.error на logger**

```typescript
// Before:
console.error('Invalid environment variables:');
console.error(result.error.format());

// After:
import { logger } from '../shared/logger/index.ts';

logger.error({ errors: result.error.format() }, 'Invalid environment variables');
```

Примечание: Нужно проверить что logger доступен на этапе загрузки конфига. Если нет - может потребоваться другой подход.

**Step 3: Проверить что приложение стартует**

```bash
cd api && npm run build && npm start
```

**Step 4: Commit**

```bash
git add api/src && git commit -m "refactor: replace console.error with logger in env config

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Финальная проверка Google Style Guide

**Step 1: Запустить линтер**

```bash
npm run lint
```

**Step 2: Проверить naming conventions**

- UpperCamelCase для типов/интерфейсов
- lowerCamelCase для переменных/функций
- CONSTANT_CASE для констант

**Step 3: Проверить отсутствие default exports**

```bash
grep -r "export default" api/src notifications/src || echo "No default exports found"
```

**Step 4: Запустить все unit тесты**

```bash
cd api && npm test -- --testPathPattern=unit
cd ../notifications && bun test
```

**Step 5: Финальный commit (если были изменения)**

```bash
git add -A && git commit -m "refactor: final Google Style Guide compliance fixes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Порядок выполнения

1. Task 1: Импорты `.js` → `.ts`
2. Task 2: Убрать eslint-disable комментарии
3. Task 3: Исправить authMiddleware типизацию
4. Task 4: Создать mock-фабрики для тестов
5. Task 5: Создать type guard для JWT
6. Task 6: Вынести magic numbers в константы
7. Task 7: Рефакторинг дублирования auth
8. Task 8: Заменить console.error на logger
9. Task 9: Финальная проверка Google Style Guide

---

## Критерии завершения

- [ ] Все импорты используют `.ts` расширение
- [ ] Нет eslint-disable комментариев
- [ ] Нет `as never` в route файлах
- [ ] Тесты используют mock-фабрики вместо `as unknown as`
- [ ] JWT verify использует type guard
- [ ] Magic numbers вынесены в константы
- [ ] console.error заменён на logger
- [ ] `npm run lint` проходит без ошибок
- [ ] Все тесты проходят
