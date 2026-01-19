# План аудита и документации приложения Budget App

**Дата:** 2026-01-19
**Статус:** Утверждён

---

## 1. Обзор плана

### Цели

1. **Аудит бизнес-логики** — проверить корректность работы всех модулей приложения
2. **Аудит кода** — проверить соответствие стандартам качества кода
3. **Скрипты запуска** — создать удобные скрипты для development и production режимов
4. **Документация** — написать полное руководство по приложению на русском языке

### Критерии успеха

- [ ] Все модули проверены на корректность бизнес-логики
- [ ] `npm run check-all` проходит без ошибок
- [ ] Существуют рабочие скрипты для dev и prod режимов
- [ ] Создана документация с архитектурой, API reference, и руководством по запуску

---

## 2. Аудит приложения

### 2.1 Аудит бизнес-логики

#### Auth модуль (`api/src/modules/auth/`)

| Проверка | Описание | Критерий |
|----------|----------|----------|
| Регистрация | Уникальность email | Ошибка 409 при дублировании |
| Регистрация | Хеширование пароля | bcrypt/argon2, не plaintext |
| Регистрация | Валидация email | Формат email через Zod |
| Регистрация | Валидация пароля | Минимальная длина |
| Логин | Проверка credentials | Корректное сравнение хешей |
| Логин | Генерация JWT | Access + Refresh токены |
| Refresh | Ротация токенов | Старый токен инвалидируется |
| Refresh | Защита от replay | Токен одноразовый |
| Logout | Удаление токена | Refresh token удалён из БД |

#### Transactions модуль (`api/src/modules/transactions/`)

| Проверка | Описание | Критерий |
|----------|----------|----------|
| Create | Права доступа | Транзакция привязана к userId |
| Create | Валидация amount | amount > 0 |
| Create | Валидация type | Только INCOME или EXPENSE |
| Create | Валидация category | Категория существует и принадлежит пользователю |
| Create | Событие | Публикация TRANSACTION_CREATED в RabbitMQ |
| Read | Фильтрация | Только свои транзакции |
| Update | Права доступа | Нельзя редактировать чужие |
| Delete | Права доступа | Нельзя удалять чужие |

#### Budgets модуль (`api/src/modules/budgets/`)

| Проверка | Описание | Критерий |
|----------|----------|----------|
| Create | Уникальность | Один бюджет на месяц/год на пользователя |
| Create | Валидация периода | Корректный month (1-12), year |
| Limits | Создание лимита | Привязка к категории |
| Limits | Проверка превышения | При транзакции сравнение с лимитом |
| Limits | Уведомление | Событие при превышении лимита |

#### Goals модуль (`api/src/modules/goals/`)

| Проверка | Описание | Критерий |
|----------|----------|----------|
| Create | Валидация target | targetAmount > 0 |
| Deposit | Валидация суммы | amount > 0 |
| Deposit | Обновление прогресса | currentAmount += amount |
| Deposit | Событие | Публикация GOAL_DEPOSIT в RabbitMQ |
| Status | Автозавершение | completed = true при достижении target |

#### Categories модуль (`api/src/modules/categories/`)

| Проверка | Описание | Критерий |
|----------|----------|----------|
| Create | Привязка к пользователю | userId в записи |
| Read | Фильтрация | Только свои + системные |
| Delete | Проверка зависимостей | Нельзя удалить если есть транзакции |

#### Notifications сервис (`notifications/src/`)

| Проверка | Описание | Критерий |
|----------|----------|----------|
| Consumer | Подключение к RabbitMQ | Graceful reconnect |
| Handler | TRANSACTION_CREATED | Отправка в Telegram |
| Handler | GOAL_DEPOSIT | Отправка в Telegram |
| Settings | Получение chatId | По userId из БД |
| Telegram | Отправка сообщений | Обработка ошибок API |

---

### 2.2 Аудит кода

#### TypeScript strict compliance

```bash
# Проверка компиляции
npm run typecheck
```

**Чек-лист:**
- [ ] `strict: true` в tsconfig.json
- [ ] Отсутствие `any` типов (кроме обоснованных)
- [ ] Корректные type guards для JWT payload
- [ ] Generics вместо приведения типов

#### ESLint правила

```bash
# Проверка линтинга
npm run lint
```

**Чек-лист:**
- [ ] Нет ошибок ESLint
- [ ] Нет warnings (или обоснованные disable комментарии)
- [ ] no-floating-promises — все промисы обработаны
- [ ] no-misused-promises — промисы не в условиях

#### Prettier форматирование

```bash
# Проверка форматирования
npm run format:check
```

**Чек-лист:**
- [ ] Единый стиль кода во всех файлах
- [ ] Консистентные отступы, кавычки, запятые

#### Архитектурные паттерны

**Чек-лист:**
- [ ] DDD структура соблюдена в каждом модуле
- [ ] Repository pattern — абстракция от Prisma
- [ ] Dependency Injection — зависимости передаются явно
- [ ] AppError — единый класс ошибок
- [ ] HTTP коды — корректные статусы ответов
- [ ] Pino логирование — структурированные логи

#### Безопасность

**Чек-лист:**
- [ ] Параметризованные запросы (Prisma)
- [ ] Zod валидация на всех endpoints
- [ ] Нет хардкода секретов
- [ ] CORS настроен корректно
- [ ] Rate limiting через Nginx

---

## 3. Скрипты запуска

### 3.1 Development режим

**Файл: `scripts/dev.sh`**

```bash
#!/bin/bash
set -e

echo "🚀 Запуск development окружения..."

# 1. Поднять инфраструктуру
echo "📦 Запуск PostgreSQL и RabbitMQ..."
docker compose up -d postgres-api postgres-notifications rabbitmq

# 2. Ожидание готовности БД
echo "⏳ Ожидание готовности баз данных..."
sleep 5

# 3. Миграции
echo "🔄 Применение миграций..."
cd api && bunx prisma migrate dev && cd ..
cd notifications && bunx prisma migrate dev && cd ..

# 4. Генерация Prisma клиентов
echo "🔧 Генерация Prisma клиентов..."
cd api && bunx prisma generate && cd ..
cd notifications && bunx prisma generate && cd ..

# 5. Запуск сервисов в watch режиме
echo "🏃 Запуск сервисов..."
echo "API: http://localhost:3000"
echo "Notifications: http://localhost:3001"
echo ""

# Запуск в параллельных процессах
npm run api:dev & npm run notifications:dev &
wait
```

**Альтернативный запуск через package.json:**

```json
{
  "scripts": {
    "dev": "scripts/dev.sh",
    "dev:infra": "docker compose up -d postgres-api postgres-notifications rabbitmq",
    "dev:services": "npm run api:dev & npm run notifications:dev"
  }
}
```

---

### 3.2 Production режим

**Файл: `docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  postgres-api:
    image: postgres:17-alpine
    container_name: budget-postgres-api-prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: budget_api
    volumes:
      - postgres_api_data:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d budget_api"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  postgres-notifications:
    image: postgres:17-alpine
    container_name: budget-postgres-notifications-prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: budget_notifications
    volumes:
      - postgres_notifications_data:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d budget_notifications"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  rabbitmq:
    image: rabbitmq:4-alpine
    container_name: budget-rabbitmq-prod
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-guest}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-guest}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - backend
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: budget-api-prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-api:5432/budget_api
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_ACCESS_EXPIRES_IN: ${JWT_ACCESS_EXPIRES_IN:-15m}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN:-7d}
      RABBITMQ_URL: amqp://${RABBITMQ_USER:-guest}:${RABBITMQ_PASSWORD:-guest}@rabbitmq:5672
    depends_on:
      postgres-api:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  notifications:
    build:
      context: ./notifications
      dockerfile: Dockerfile
    container_name: budget-notifications-prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-notifications:5432/budget_notifications
      RABBITMQ_URL: amqp://${RABBITMQ_USER:-guest}:${RABBITMQ_PASSWORD:-guest}@rabbitmq:5672
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
    depends_on:
      postgres-notifications:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: budget-nginx-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - backend
      - frontend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 128M

networks:
  backend:
    driver: bridge
    internal: true
  frontend:
    driver: bridge

volumes:
  postgres_api_data:
  postgres_notifications_data:
  rabbitmq_data:
```

---

**Файл: `scripts/start-prod.sh`**

```bash
#!/bin/bash
set -e

echo "🚀 Запуск production окружения..."

# Проверка .env файла
if [ ! -f .env ]; then
    echo "❌ Ошибка: .env файл не найден"
    echo "Скопируйте .env.example в .env и заполните переменные"
    exit 1
fi

# Проверка обязательных переменных
source .env
required_vars=("DB_USER" "DB_PASSWORD" "JWT_ACCESS_SECRET" "JWT_REFRESH_SECRET" "TELEGRAM_BOT_TOKEN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Ошибка: переменная $var не задана"
        exit 1
    fi
done

# Сборка и запуск
echo "🔨 Сборка образов..."
docker compose -f docker-compose.prod.yml build

echo "🏃 Запуск контейнеров..."
docker compose -f docker-compose.prod.yml up -d

echo "✅ Production окружение запущено"
echo "API доступен на http://localhost:80"
```

---

**Файл: `scripts/stop.sh`**

```bash
#!/bin/bash

echo "🛑 Остановка контейнеров..."

if [ "$1" == "prod" ]; then
    docker compose -f docker-compose.prod.yml down
else
    docker compose down
fi

echo "✅ Контейнеры остановлены"
```

---

**Файл: `scripts/logs.sh`**

```bash
#!/bin/bash

SERVICE=${1:-""}

if [ "$SERVICE" == "" ]; then
    echo "Просмотр логов всех сервисов..."
    docker compose logs -f
else
    echo "Просмотр логов сервиса: $SERVICE"
    docker compose logs -f "$SERVICE"
fi
```

---

**Файл: `scripts/db-backup.sh`**

```bash
#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "📦 Создание бэкапа баз данных..."

# Бэкап API БД
docker exec budget-postgres-api-prod pg_dump -U "$DB_USER" budget_api > "$BACKUP_DIR/api_$TIMESTAMP.sql"
echo "✅ API бэкап: $BACKUP_DIR/api_$TIMESTAMP.sql"

# Бэкап Notifications БД
docker exec budget-postgres-notifications-prod pg_dump -U "$DB_USER" budget_notifications > "$BACKUP_DIR/notifications_$TIMESTAMP.sql"
echo "✅ Notifications бэкап: $BACKUP_DIR/notifications_$TIMESTAMP.sql"

echo "✅ Бэкап завершён"
```

---

**Файл: `Makefile`**

```makefile
.PHONY: dev prod stop test lint logs backup

# Development
dev:
	./scripts/dev.sh

dev-infra:
	docker compose up -d postgres-api postgres-notifications rabbitmq

# Production
prod:
	./scripts/start-prod.sh

stop:
	./scripts/stop.sh

stop-prod:
	./scripts/stop.sh prod

# Testing
test:
	npm run api:test && npm run notifications:test

test-cov:
	cd api && bun test tests/unit --coverage

# Code quality
lint:
	npm run check-all

format:
	npm run format

# Logs
logs:
	./scripts/logs.sh

logs-api:
	./scripts/logs.sh api

logs-notifications:
	./scripts/logs.sh notifications

# Backup
backup:
	./scripts/db-backup.sh
```

---

## 4. Документация приложения

### 4.1 Архитектура системы

**Диаграмма микросервисов:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         КЛИЕНТ                                  │
│                    (Web/Mobile App)                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX                                   │
│              (Reverse Proxy + Rate Limiting)                    │
│                                                                 │
│  • Rate Limiting: auth 5r/min, general 10r/sec                 │
│  • Security Headers (X-Frame-Options, CSP, etc.)               │
│  • SSL Termination (production)                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│       API SERVICE       │     │  NOTIFICATIONS SERVICE  │
│      (Fastify + Bun)    │     │     (Fastify + Bun)     │
│                         │     │                         │
│  • Auth (JWT)           │     │  • Telegram Bot         │
│  • Transactions         │────▶│  • Event Handlers       │
│  • Budgets              │     │  • User Settings        │
│  • Goals                │     │                         │
│  • Categories           │     │                         │
└───────────┬─────────────┘     └───────────┬─────────────┘
            │                               │
            │                               │
            ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    POSTGRESQL (API)     │     │ POSTGRESQL (Notifications)│
│                         │     │                         │
│  • Users                │     │  • NotificationSettings │
│  • RefreshTokens        │     │                         │
│  • Categories           │     │                         │
│  • Transactions         │     │                         │
│  • Budgets              │     │                         │
│  • BudgetLimits         │     │                         │
│  • Goals                │     │                         │
└─────────────────────────┘     └─────────────────────────┘

            │                               │
            └───────────────┬───────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │       RABBITMQ          │
              │    (Message Broker)     │
              │                         │
              │  Events:                │
              │  • TRANSACTION_CREATED  │
              │  • GOAL_DEPOSIT         │
              └─────────────────────────┘
```

---

**Описание сервисов:**

| Сервис | Порт | Описание |
|--------|------|----------|
| **API** | 3000 | REST API для управления бюджетом. Обрабатывает все CRUD операции |
| **Notifications** | 3001 | Сервис уведомлений. Слушает события из RabbitMQ и отправляет в Telegram |
| **PostgreSQL API** | 5432 | База данных для основного API |
| **PostgreSQL Notifications** | 5433 | База данных для настроек уведомлений |
| **RabbitMQ** | 5672 | Брокер сообщений для асинхронного взаимодействия |
| **Nginx** | 80/443 | Reverse proxy с rate limiting и security headers |

---

**ER-диаграмма базы данных API:**

```
┌──────────────────┐     ┌──────────────────┐
│      User        │     │   RefreshToken   │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │────┤│ id (PK)          │
│ email            │     │ token            │
│ password         │     │ userId (FK)      │
│ createdAt        │     │ expiresAt        │
│ updatedAt        │     │ createdAt        │
└────────┬─────────┘     └──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐     ┌──────────────────┐
│    Category      │     │   Transaction    │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │◀───┤│ id (PK)          │
│ name             │     │ amount           │
│ type             │     │ type (INCOME/    │
│ userId (FK)      │     │       EXPENSE)   │
│ isSystem         │     │ description      │
│ createdAt        │     │ categoryId (FK)  │
└──────────────────┘     │ userId (FK)      │
                         │ createdAt        │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│     Budget       │     │   BudgetLimit    │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │────┤│ id (PK)          │
│ month            │     │ amount           │
│ year             │     │ budgetId (FK)    │
│ userId (FK)      │     │ categoryId (FK)  │
│ createdAt        │     │ createdAt        │
└──────────────────┘     └──────────────────┘

┌──────────────────┐
│      Goal        │
├──────────────────┤
│ id (PK)          │
│ name             │
│ targetAmount     │
│ currentAmount    │
│ completed        │
│ userId (FK)      │
│ createdAt        │
└──────────────────┘
```

---

### 4.2 API Reference

**Base URL:** `http://localhost:8080/api` (через Nginx) или `http://localhost:3000` (напрямую)

---

#### Аутентификация

Все защищённые endpoints требуют заголовок:
```
Authorization: Bearer <access_token>
```

---

#### Auth endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/auth/register` | Регистрация пользователя |
| POST | `/auth/login` | Авторизация |
| POST | `/auth/refresh` | Обновление токенов |
| POST | `/auth/logout` | Выход |

**POST /auth/register**

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response 201
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "tokens": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}

// Response 409
{
  "error": "User with this email already exists"
}
```

**POST /auth/login**

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response 200
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "tokens": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}

// Response 401
{
  "error": "Invalid credentials"
}
```

**POST /auth/refresh**

```json
// Request
{
  "refreshToken": "eyJhbG..."
}

// Response 200
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

---

#### Transactions endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/transactions` | Список транзакций |
| GET | `/transactions/:id` | Получить транзакцию |
| POST | `/transactions` | Создать транзакцию |
| PUT | `/transactions/:id` | Обновить транзакцию |
| DELETE | `/transactions/:id` | Удалить транзакцию |

**POST /transactions**

```json
// Request
{
  "amount": 1500.00,
  "type": "EXPENSE",
  "description": "Покупка продуктов",
  "categoryId": "category-uuid"
}

// Response 201
{
  "id": "uuid",
  "amount": 1500.00,
  "type": "EXPENSE",
  "description": "Покупка продуктов",
  "categoryId": "category-uuid",
  "userId": "user-uuid",
  "createdAt": "2026-01-19T12:00:00Z"
}
```

---

#### Budgets endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/budgets` | Список бюджетов |
| GET | `/budgets/:id` | Получить бюджет |
| POST | `/budgets` | Создать бюджет |
| PUT | `/budgets/:id` | Обновить бюджет |
| DELETE | `/budgets/:id` | Удалить бюджет |
| POST | `/budgets/:id/limits` | Добавить лимит категории |

**POST /budgets**

```json
// Request
{
  "month": 1,
  "year": 2026
}

// Response 201
{
  "id": "uuid",
  "month": 1,
  "year": 2026,
  "userId": "user-uuid",
  "limits": [],
  "createdAt": "2026-01-19T12:00:00Z"
}
```

**POST /budgets/:id/limits**

```json
// Request
{
  "categoryId": "category-uuid",
  "amount": 10000.00
}

// Response 201
{
  "id": "uuid",
  "budgetId": "budget-uuid",
  "categoryId": "category-uuid",
  "amount": 10000.00
}
```

---

#### Goals endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/goals` | Список целей |
| GET | `/goals/:id` | Получить цель |
| POST | `/goals` | Создать цель |
| PUT | `/goals/:id` | Обновить цель |
| DELETE | `/goals/:id` | Удалить цель |
| POST | `/goals/:id/deposit` | Внести депозит |

**POST /goals**

```json
// Request
{
  "name": "Отпуск",
  "targetAmount": 100000.00
}

// Response 201
{
  "id": "uuid",
  "name": "Отпуск",
  "targetAmount": 100000.00,
  "currentAmount": 0,
  "completed": false,
  "userId": "user-uuid",
  "createdAt": "2026-01-19T12:00:00Z"
}
```

**POST /goals/:id/deposit**

```json
// Request
{
  "amount": 5000.00
}

// Response 200
{
  "id": "uuid",
  "name": "Отпуск",
  "targetAmount": 100000.00,
  "currentAmount": 5000.00,
  "completed": false
}
```

---

#### Categories endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/categories` | Список категорий |
| POST | `/categories` | Создать категорию |
| PUT | `/categories/:id` | Обновить категорию |
| DELETE | `/categories/:id` | Удалить категорию |

---

#### Служебные endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus метрики |
| GET | `/docs` | Swagger документация |

---

### 4.3 Workflow и потоки данных

#### Регистрация и авторизация

```
┌────────┐     POST /auth/register      ┌─────────┐
│ Client │ ───────────────────────────▶ │   API   │
└────────┘                              └────┬────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        ▼                        │
                    │  1. Валидация email и password (Zod)           │
                    │  2. Проверка уникальности email                 │
                    │  3. Хеширование пароля (bcrypt)                │
                    │  4. Создание User в БД                         │
                    │  5. Генерация JWT пары (access + refresh)      │
                    │  6. Сохранение RefreshToken в БД               │
                    └────────────────────────┬────────────────────────┘
                                             │
┌────────┐     { user, tokens }             │
│ Client │ ◀────────────────────────────────┘
└────────┘
```

---

#### Создание транзакции с уведомлением

```
┌────────┐    POST /transactions    ┌─────────┐    TRANSACTION_CREATED    ┌───────────────┐
│ Client │ ───────────────────────▶ │   API   │ ──────────────────────▶   │   RabbitMQ    │
└────────┘                          └────┬────┘                           └───────┬───────┘
                                         │                                        │
                    ┌────────────────────┼───────────────────┐                    │
                    │                    ▼                   │                    │
                    │  1. Валидация JWT токена              │                    │
                    │  2. Валидация данных (Zod)            │                    │
                    │  3. Проверка категории                │                    │
                    │  4. Создание транзакции               │                    │
                    │  5. Проверка лимитов бюджета          │                    │
                    │  6. Публикация события в RabbitMQ     │                    │
                    └────────────────────┬───────────────────┘                    │
                                         │                                        │
┌────────┐      { transaction }          │                                        │
│ Client │ ◀─────────────────────────────┘                                        │
└────────┘                                                                        │
                                                                                  │
                                                                                  ▼
                                                                   ┌───────────────────────┐
                                                                   │ Notifications Service │
                                                                   └───────────┬───────────┘
                                                                               │
                                          ┌────────────────────────────────────┼───────────────┐
                                          │                                    ▼               │
                                          │  1. Получение события из очереди                  │
                                          │  2. Получение настроек пользователя               │
                                          │  3. Получение chatId из БД                        │
                                          │  4. Формирование сообщения                        │
                                          │  5. Отправка в Telegram                           │
                                          └────────────────────────────────────┬───────────────┘
                                                                               │
                                                                               ▼
                                                                   ┌───────────────────────┐
                                                                   │      Telegram         │
                                                                   │   (Уведомление)       │
                                                                   └───────────────────────┘
```

---

#### Жизненный цикл JWT токенов

```
                           ┌─────────────────────────────────────────┐
                           │            Access Token                 │
                           │         (короткоживущий: 15m)           │
                           │                                         │
                           │  • Используется для авторизации         │
                           │  • Хранится в памяти клиента            │
                           │  • Не хранится на сервере               │
                           └─────────────────────────────────────────┘
                                             │
                                             │ истёк?
                                             ▼
┌────────┐    POST /auth/refresh    ┌─────────────────────────────────────────┐
│ Client │ ───────────────────────▶ │            Refresh Token                │
└────────┘                          │         (долгоживущий: 7d)              │
                                    │                                         │
                                    │  • Используется только для refresh      │
                                    │  • Хранится в БД (RefreshToken)         │
                                    │  • Одноразовый (ротация при refresh)    │
                                    └─────────────────────────────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────────┐
                                    │  Новая JWT пара:    │
                                    │  • new accessToken  │
                                    │  • new refreshToken │
                                    │                     │
                                    │  Старый refresh     │
                                    │  удаляется из БД    │
                                    └─────────────────────┘
```

---

### 4.4 Руководство по запуску

#### Требования

| Компонент | Версия | Установка |
|-----------|--------|-----------|
| **Bun** | 1.3.5+ | `curl -fsSL https://bun.sh/install \| bash` |
| **Docker** | 24.0+ | https://docs.docker.com/get-docker/ |
| **Docker Compose** | 2.20+ | Включён в Docker Desktop |

---

#### Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

**Обязательные переменные:**

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DB_USER` | Пользователь PostgreSQL | `postgres` |
| `DB_PASSWORD` | Пароль PostgreSQL | `secure_password` |
| `JWT_ACCESS_SECRET` | Секрет для access токенов (мин. 32 символа) | `your-32-char-secret-key-here!!` |
| `JWT_REFRESH_SECRET` | Секрет для refresh токенов (мин. 32 символа) | `another-32-char-secret-key!!!` |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | `123456:ABC-DEF...` |

**Опциональные переменные:**

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `JWT_ACCESS_EXPIRES_IN` | Время жизни access токена | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Время жизни refresh токена | `7d` |
| `RABBITMQ_USER` | Пользователь RabbitMQ | `guest` |
| `RABBITMQ_PASSWORD` | Пароль RabbitMQ | `guest` |

---

#### Запуск в Development режиме

**Способ 1: Makefile**

```bash
make dev
```

**Способ 2: Пошагово**

```bash
# 1. Установка зависимостей
bun install

# 2. Запуск инфраструктуры (PostgreSQL, RabbitMQ)
docker compose up -d postgres-api postgres-notifications rabbitmq

# 3. Ожидание готовности БД (5-10 секунд)
sleep 10

# 4. Миграции
cd api && bunx prisma migrate dev && cd ..
cd notifications && bunx prisma migrate dev && cd ..

# 5. Генерация Prisma клиентов
cd api && bunx prisma generate && cd ..
cd notifications && bunx prisma generate && cd ..

# 6. Запуск сервисов
npm run api:dev &
npm run notifications:dev &
```

**Проверка:**
- API: http://localhost:3000/health
- Swagger: http://localhost:3000/docs
- Notifications: http://localhost:3001/health

---

#### Запуск в Production режиме

```bash
# 1. Проверка .env файла
cat .env  # убедитесь, что все переменные заданы

# 2. Запуск через Makefile
make prod

# Или через скрипт
./scripts/start-prod.sh
```

**Проверка:**
- API (через Nginx): http://localhost:80/api/health
- Swagger: http://localhost:80/api/docs

---

#### Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен и добавьте в `TELEGRAM_BOT_TOKEN`
3. Запустите приложение
4. Отправьте `/start` боту — он сохранит ваш `chatId`
5. Привяжите `chatId` к пользователю через API настроек

---

### 4.5 Тестирование

#### Запуск unit тестов

```bash
# Все unit тесты
npm run api:test
npm run notifications:test

# С покрытием
cd api && bun test tests/unit --coverage
```

#### Структура тестов

```
api/tests/
├── unit/
│   ├── auth.service.spec.ts        # Тесты auth сервиса
│   ├── goal.service.spec.ts        # Тесты goal сервиса
│   └── controllers/
│       ├── auth.controller.spec.ts
│       ├── budget.controller.spec.ts
│       ├── category.controller.spec.ts
│       ├── goal.controller.spec.ts
│       └── transaction.controller.spec.ts
└── helpers/
    └── mock-factories.ts           # Фабрики моков
```

#### Известные ограничения

**Bun + Fastify `inject()` incompatibility:**

Bun's HTTP handling имеет несовместимость с методом `inject()` Fastify. Решение:
- **Unit тесты** — используют Bun, тестируют сервисы и контроллеры напрямую
- **Integration тесты** — используют Node.js + Jest + Testcontainers

Подробности: `docs/INTEGRATION_BUG.md`

---

### 4.6 Troubleshooting

#### Частые проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
| `ECONNREFUSED` к PostgreSQL | БД не запущена | `docker compose up -d postgres-api` |
| `Invalid token` | Истёк access token | Вызвать `/auth/refresh` |
| `Prisma Client not generated` | Не выполнен generate | `bunx prisma generate` |
| `Migration failed` | БД недоступна | Проверить `docker compose logs postgres-api` |
| Telegram не отправляет | Неверный токен или chatId | Проверить `TELEGRAM_BOT_TOKEN` |

#### Диагностика

**Проверка состояния сервисов:**

```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health

# Docker статус
docker compose ps

# Логи
make logs
# или
docker compose logs -f api
```

**Проверка подключения к БД:**

```bash
docker exec -it budget-postgres-api psql -U postgres -d budget_api -c "SELECT 1"
```

**Проверка RabbitMQ:**

```bash
docker exec -it budget-rabbitmq rabbitmqctl list_queues
```

**Метрики (Prometheus):**

```bash
curl http://localhost:3000/metrics
```

---

## 5. Чек-лист выполнения

### Аудит

- [ ] Auth модуль проверен
- [ ] Transactions модуль проверен
- [ ] Budgets модуль проверен
- [ ] Goals модуль проверен
- [ ] Categories модуль проверен
- [ ] Notifications сервис проверен
- [ ] `npm run check-all` проходит
- [ ] Безопасность проверена

### Скрипты

- [ ] `scripts/dev.sh` создан и работает
- [ ] `docker-compose.prod.yml` создан
- [ ] `scripts/start-prod.sh` создан
- [ ] `scripts/stop.sh` создан
- [ ] `scripts/logs.sh` создан
- [ ] `scripts/db-backup.sh` создан
- [ ] `Makefile` создан

### Документация

- [ ] Архитектура описана
- [ ] API Reference готов
- [ ] Workflow диаграммы добавлены
- [ ] Руководство по запуску написано
- [ ] Раздел тестирования готов
- [ ] Troubleshooting добавлен

---

*Документ создан: 2026-01-19*
