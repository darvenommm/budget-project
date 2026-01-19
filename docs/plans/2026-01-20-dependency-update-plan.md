# План обновления зависимостей до актуальных версий

**Дата:** 2026-01-20
**Цель:** Обновить все зависимости (npm + Docker) до последних стабильных версий
**Подход:** Послойное обновление с верификацией после каждого слоя

---

## 1. Обзор текущего состояния и целевых версий

### 1.1 Docker-инфраструктура

| Компонент | Текущая версия | Целевая версия | Тип изменения |
|-----------|----------------|----------------|---------------|
| PostgreSQL | `17-alpine` | `18-alpine` | Major ⚠️ |
| RabbitMQ | `4-alpine` | `4.2-alpine` | Minor |
| Bun | `1-alpine` | `1.3-alpine` | Minor |
| Nginx | `alpine` (unpinned!) | `1.27-alpine` | Pin + Minor |

### 1.2 NPM зависимости (корень)

| Пакет | Текущая | Целевая | Breaking? |
|-------|---------|---------|-----------|
| TypeScript | ^5.3.3 | ^5.7.0 | Нет |
| ESLint | ^8.56.0 | ^9.25.0 | **Да** (flat config) |
| @typescript-eslint/* | ^6.19.0 / ^7.0.0 | — | Удалить |
| typescript-eslint | — | ^8.52.0 | Новый пакет |
| Prettier | ^3.8.0 | ^3.7.4 | Проверить |
| @eslint/js | ^8.56.0 | — | Удалить |

### 1.3 NPM зависимости (API сервис)

| Пакет | Текущая | Целевая | Breaking? |
|-------|---------|---------|-----------|
| Fastify | ^4.25.2 | ^5.6.0 | **Да** |
| @fastify/cors | ^8.5.0 | ^11.2.0 | **Да** |
| @fastify/swagger | ^8.13.0 | ^9.x | **Да** |
| @fastify/swagger-ui | ^2.1.0 | ^5.x | **Да** |
| Pino | ^8.17.2 | ^10.2.0 | **Да** |
| Zod | ^3.22.4 | ^4.3.0 | **Да** (major!) |
| Vitest | ^4.0.17 | Проверить | — |
| @vitest/coverage-v8 | ^4.0.17 | Проверить | — |

### 1.4 NPM зависимости (Notifications сервис)

| Пакет | Текущая | Целевая | Breaking? |
|-------|---------|---------|-----------|
| Fastify | ^5.2.1 | ^5.6.0 | Нет (minor) |
| Pino | ^9.6.0 | ^10.2.0 | **Да** |
| Zod | ^3.24.1 | ^4.3.0 | **Да** |
| amqplib | ^0.10.5 | latest | Нет |

---

## 2. Breaking Changes и необходимые изменения кода

### 2.1 ESLint 8 → 9 (Flat Config)

**Что меняется:**
- `.eslintrc.js` / `.eslintrc.json` → `eslint.config.js`
- Плагины подключаются как ES-импорты
- `env`, `extends`, `parserOptions` → новый формат

**Пример миграции:**

```javascript
// БЫЛО: .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: { project: './tsconfig.json' }
}

// СТАЛО: eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json' }
    }
  }
);
```

**Пакеты:**
- Удалить: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@eslint/js`
- Добавить: `typescript-eslint` (единый пакет)

### 2.2 Fastify 4 → 5

**Основные изменения:**
- `reply.send()` теперь всегда async
- `request.body` типизация строже
- Изменения в lifecycle hooks
- `setErrorHandler` — новая сигнатура

**Пример фикса:**

```typescript
// БЫЛО
fastify.get('/users', (request, reply) => {
  reply.send({ users: [] });
});

// СТАЛО
fastify.get('/users', async (request, reply) => {
  return { users: [] };
});
```

**Плагины для Fastify 5:**
- `@fastify/cors` ^8 → ^11
- `@fastify/swagger` ^8 → ^9+
- `@fastify/swagger-ui` ^2 → ^5+

### 2.3 Pino 8/9 → 10

**Основные изменения:**
- `pino-pretty` теперь отдельный transport
- Изменения в formatters API
- `timestamp` опция изменена

**Пример фикса:**

```typescript
// БЫЛО
import pino from 'pino';
const logger = pino({ prettyPrint: true });

// СТАЛО
import pino from 'pino';
const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});
```

### 2.4 Zod 3 → 4 (самое серьёзное!)

**Критические изменения:**
- `z.object()` → immutable по умолчанию
- `.parse()` возвращает `Readonly<T>`
- Email/URL валидация строже
- `.transform()` API изменён
- Ошибки имеют новый формат

**Пример адаптации:**

```typescript
// Если код мутирует результат parse(), добавить .mutable()
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number()
}).mutable();

// Или адаптировать код к работе с readonly объектами
```

**Масштаб:** Проверить ВСЕ схемы в обоих сервисах.

### 2.5 PostgreSQL 17 → 18

**Возможные изменения:**
- Новые reserved keywords
- Изменения в pg_dump формате
- Возможные изменения в индексах

**Действия:**
- Backup данных перед обновлением
- Тестировать миграции на чистой БД
- Проверить совместимость Prisma с PG 18

---

## 3. План выполнения по фазам

### Фаза 0: Подготовка

- [ ] Создать ветку `feature/deps-update-2026`
- [ ] Backup `package-lock.json` / `bun.lockb`
- [ ] Зафиксировать текущее состояние тестов
- [ ] Backup Docker volumes PostgreSQL (если нужно)

### Фаза 1: Docker-инфраструктура

| # | Действие | Файл | Верификация |
|---|----------|------|-------------|
| 1.1 | Nginx: `alpine` → `1.27-alpine` | `nginx/Dockerfile` | `docker compose build nginx` |
| 1.2 | Bun: `1-alpine` → `1.3-alpine` | `api/Dockerfile`, `notifications/Dockerfile` | `docker compose build api notifications` |
| 1.3 | RabbitMQ: `4-alpine` → `4.2-alpine` | `docker-compose.yml`, `docker-compose.prod.yml` | Health check |
| 1.4 | PostgreSQL: `17-alpine` → `18-alpine` | `docker-compose.yml`, `docker-compose.prod.yml` | `pg_isready` |
| 1.5 | Полный запуск | — | Все health checks |

**Коммит:** `chore: update Docker images to latest versions`

### Фаза 2: Tooling (корневые зависимости)

| # | Действие | Верификация |
|---|----------|-------------|
| 2.1 | TypeScript → ^5.7.0 | `npx tsc --version` |
| 2.2 | Проверить/обновить Prettier | `npx prettier --version` |
| 2.3 | Удалить: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@eslint/js` | — |
| 2.4 | Установить: `eslint@^9.25.0`, `typescript-eslint@^8.52.0` | — |
| 2.5 | Создать `eslint.config.js` | — |
| 2.6 | Удалить `.eslintrc.*` | — |
| 2.7 | Проверить линтинг | `npx eslint api/src notifications/src` |
| 2.8 | Исправить ошибки линтинга | Линтинг проходит |

**Коммит:** `chore: migrate to ESLint 9 flat config`

### Фаза 3: API-сервис

| # | Действие | Верификация |
|---|----------|-------------|
| 3.1 | Fastify → ^5.6.0 | — |
| 3.2 | @fastify/cors → ^11.2.0 | — |
| 3.3 | @fastify/swagger + swagger-ui обновить | — |
| 3.4 | Исправить breaking changes Fastify 5 | `npx tsc --noEmit` |
| 3.5 | Pino → ^10.2.0 | — |
| 3.6 | Исправить logger конфигурацию | — |
| 3.7 | Zod → ^4.3.0 | — |
| 3.8 | Исправить все Zod-схемы | `npx tsc --noEmit` |
| 3.9 | Vitest + остальные deps | — |
| 3.10 | Запустить тесты | `bun test` |
| 3.11 | Исправить падающие тесты | Все зелёные |
| 3.12 | Запустить сервис | Health check OK |

**Коммит:** `feat(api): update to Fastify 5, Pino 10, Zod 4`

### Фаза 4: Notifications-сервис

| # | Действие | Верификация |
|---|----------|-------------|
| 4.1 | Fastify → ^5.6.0 | — |
| 4.2 | Pino → ^10.2.0 | — |
| 4.3 | Zod → ^4.3.0 | — |
| 4.4 | Синхронизировать amqplib, jsonwebtoken с API | — |
| 4.5 | Исправить breaking changes | `npx tsc --noEmit` |
| 4.6 | Запустить сервис | Health check OK |

**Коммит:** `feat(notifications): update to Fastify 5, Pino 10, Zod 4`

### Фаза 5: Финальная верификация

| # | Проверка | Команда |
|---|----------|---------|
| 5.1 | Типизация API | `cd api && npx tsc --noEmit` |
| 5.2 | Типизация Notifications | `cd notifications && npx tsc --noEmit` |
| 5.3 | Линтинг | `npx eslint api/src notifications/src` |
| 5.4 | Тесты API | `cd api && bun test` |
| 5.5 | Docker dev сборка | `docker compose build --no-cache` |
| 5.6 | Docker dev запуск | `docker compose up -d` |
| 5.7 | Health check API | `curl -f http://localhost:3000/health` |
| 5.8 | Health check Notifications | `curl -f http://localhost:3001/health` |
| 5.9 | Health check Nginx | `curl -f http://localhost/health` |
| 5.10 | Health check PostgreSQL | `docker compose exec postgres-api pg_isready` |
| 5.11 | Health check RabbitMQ | `curl -f http://localhost:15672/api/health/checks/alarms` |
| 5.12 | Swagger UI | `curl -f http://localhost/api/docs` |
| 5.13 | Smoke-тест auth endpoints | Manual testing |
| 5.14 | Интеграция API ↔ RabbitMQ ↔ Notifications | Check logs |
| 5.15 | Prisma validate | `cd api && npx prisma validate` |
| 5.16 | Docker prod сборка | `docker compose -f docker-compose.prod.yml build` |
| 5.17 | Docker prod запуск | `docker compose -f docker-compose.prod.yml up -d` |

**Финальный коммит:** `chore: complete dependency update verification`

---

## 4. Чеклист верификации (полный)

### 4.1 Статический анализ

```bash
# Типы
npx tsc --noEmit -p api/tsconfig.json
npx tsc --noEmit -p notifications/tsconfig.json

# Линтинг
npx eslint api/src notifications/src

# Форматирование
npx prettier --check "**/*.{ts,json,yml}"
```

### 4.2 Тесты

```bash
# API тесты
cd api && bun test

# Coverage
cd api && bun test --coverage
```

### 4.3 Docker

```bash
# Сборка
docker compose build --no-cache

# Запуск
docker compose up -d

# Статус
docker compose ps

# Логи
docker compose logs --tail=50
```

### 4.4 Health checks

```bash
# API
curl -f http://localhost:3000/health

# Notifications
curl -f http://localhost:3001/health

# Nginx
curl -f http://localhost/health

# PostgreSQL
docker compose exec postgres-api pg_isready
docker compose exec postgres-notifications pg_isready

# RabbitMQ
curl -f http://localhost:15672/api/health/checks/alarms
```

### 4.5 Smoke-тесты API

```bash
# Auth endpoints
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

# Swagger UI
curl -f http://localhost/api/docs
```

### 4.6 Prisma

```bash
# Validate schemas
cd api && npx prisma validate
cd notifications && npx prisma validate

# Test migrations
cd api && npx prisma migrate deploy
cd notifications && npx prisma migrate deploy
```

### 4.7 Production build

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
# Повторить health checks
```

---

## 5. Риски и откат

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Zod 4 ломает много схем | Высокая | Постепенная миграция; можно остаться на 3.x |
| PostgreSQL 18 несовместим | Низкая | Откат на 17-alpine; backup volumes |
| Fastify 5 плагины не работают | Средняя | Проверить совместимость ДО обновления |
| Тесты массово падают | Средняя | Фиксить по одному; не мержить пока не зелёные |
| ESLint flat config сложный | Низкая | Много документации; можно использовать compat |

### Процедура отката

```bash
# Откат package.json
git checkout HEAD~1 -- package.json api/package.json notifications/package.json

# Переустановка
rm -rf node_modules api/node_modules notifications/node_modules
bun install

# Откат Docker
git checkout HEAD~1 -- docker-compose.yml docker-compose.prod.yml
git checkout HEAD~1 -- api/Dockerfile notifications/Dockerfile nginx/Dockerfile
docker compose down
docker compose up -d --build
```

---

## 6. Ожидаемый результат

После выполнения плана:

1. **Все Docker образы** на актуальных версиях с явным pinning
2. **Единая версия** Fastify 5, Pino 10, Zod 4 в обоих сервисах
3. **ESLint 9** с современным flat config
4. **TypeScript 5.7** с улучшенной типизацией
5. **Все тесты** проходят
6. **Health checks** работают для всех сервисов
7. **Production build** успешно собирается и запускается
