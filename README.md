# Budget App

Приложение для управления личным бюджетом с поддержкой транзакций, категорий, бюджетов, целей накопления и Telegram-уведомлений.

## Архитектура

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
            ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    POSTGRESQL (API)     │     │ POSTGRESQL (Notifications)│
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

## Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| **API** | 3000 | REST API для управления бюджетом |
| **Notifications** | 3001 | Сервис уведомлений (Telegram) |
| **PostgreSQL API** | 5432 | База данных API |
| **PostgreSQL Notifications** | 5433 | База данных уведомлений |
| **RabbitMQ** | 5672 | Брокер сообщений |
| **Nginx** | 80/443 | Reverse proxy |

## Требования

| Компонент | Версия |
|-----------|--------|
| **Bun** | 1.3.5+ |
| **Docker** | 24.0+ |
| **Docker Compose** | 2.20+ |

## Быстрый старт

### 1. Клонирование и установка

```bash
git clone <repository-url>
cd budget-app
bun install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Заполните обязательные переменные:

| Переменная | Описание |
|------------|----------|
| `DB_USER` | Пользователь PostgreSQL |
| `DB_PASSWORD` | Пароль PostgreSQL |
| `JWT_ACCESS_SECRET` | Секрет для access токенов (мин. 32 символа) |
| `JWT_REFRESH_SECRET` | Секрет для refresh токенов (мин. 32 символа) |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота |

### 3. Запуск

**Development:**
```bash
make dev
# или
./scripts/dev.sh
```

**Production:**
```bash
make prod
# или
./scripts/start-prod.sh
```

## API Reference

**Base URL:** `http://localhost:8080/api` (через Nginx) или `http://localhost:3000` (напрямую)

### Аутентификация

Все защищённые endpoints требуют заголовок:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### Auth

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Авторизация |
| POST | `/auth/refresh` | Обновление токенов |
| POST | `/auth/logout` | Выход |

#### Transactions

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/transactions` | Список транзакций |
| GET | `/transactions/:id` | Получить транзакцию |
| POST | `/transactions` | Создать транзакцию |
| PUT | `/transactions/:id` | Обновить транзакцию |
| DELETE | `/transactions/:id` | Удалить транзакцию |

#### Budgets

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/budgets` | Список бюджетов |
| GET | `/budgets/current` | Получить бюджет |
| POST | `/budgets/current` | Создать/получить бюджет |
| POST | `/budgets/current/limits` | Добавить лимит |
| DELETE | `/budgets/current/limits/:categoryId` | Удалить лимит |
| DELETE | `/budgets/:id` | Удалить бюджет |

#### Goals

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/goals` | Список целей |
| GET | `/goals/:id` | Получить цель |
| POST | `/goals` | Создать цель |
| PUT | `/goals/:id` | Обновить цель |
| DELETE | `/goals/:id` | Удалить цель |
| POST | `/goals/:id/deposit` | Внести депозит |

#### Categories

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/categories` | Список категорий |
| POST | `/categories` | Создать категорию |
| PUT | `/categories/:id` | Обновить категорию |
| DELETE | `/categories/:id` | Удалить категорию |

#### Служебные

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus метрики |

## Тестирование

```bash
# Все unit тесты
make test

# С покрытием
make test-cov
```

## Команды Make

```bash
make dev          # Запуск development
make dev-infra    # Только инфраструктура
make prod         # Запуск production
make stop         # Остановка dev
make stop-prod    # Остановка prod
make test         # Запуск тестов
make lint         # Проверка кода
make format       # Форматирование
make logs         # Просмотр логов
make logs-api     # Логи API
make backup       # Бэкап БД
```

## Скрипты

| Скрипт | Описание |
|--------|----------|
| `scripts/dev.sh` | Запуск development окружения |
| `scripts/start-prod.sh` | Запуск production |
| `scripts/stop.sh` | Остановка контейнеров |
| `scripts/logs.sh` | Просмотр логов |
| `scripts/db-backup.sh` | Бэкап баз данных |

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| `ECONNREFUSED` к PostgreSQL | `docker compose up -d postgres-api` |
| `Invalid token` | Вызвать `/auth/refresh` |
| `Prisma Client not generated` | `bunx prisma generate` |
| `Migration failed` | `docker compose logs postgres-api` |
| Telegram не отправляет | Проверить `TELEGRAM_BOT_TOKEN` |

### Диагностика

```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health

# Docker статус
docker compose ps

# Логи
make logs
```

## Структура проекта

```
.
├── api/                    # API сервис
│   ├── src/
│   │   ├── modules/        # Бизнес-модули
│   │   │   ├── auth/       # Аутентификация
│   │   │   ├── budgets/    # Бюджеты
│   │   │   ├── categories/ # Категории
│   │   │   ├── goals/      # Цели
│   │   │   └── transactions/ # Транзакции
│   │   └── shared/         # Общие компоненты
│   ├── tests/              # Тесты
│   └── prisma/             # Схема БД
├── notifications/          # Сервис уведомлений
│   ├── src/
│   │   ├── handlers/       # Обработчики событий
│   │   ├── settings/       # Настройки пользователей
│   │   ├── telegram/       # Telegram интеграция
│   │   └── rabbitmq/       # RabbitMQ consumer
│   └── prisma/             # Схема БД
├── nginx/                  # Nginx конфигурация
├── scripts/                # Скрипты запуска
├── docker-compose.yml      # Development compose
├── docker-compose.prod.yml # Production compose
└── Makefile               # Make команды
```

## Лицензия

MIT
