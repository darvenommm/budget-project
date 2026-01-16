# BudgetApp — Приложение для бюджетирования

## Обзор

Серверное приложение для персонального бюджетирования с уведомлениями в Telegram.

### Основной функционал
- Создание месячных бюджетов с лимитами по категориям
- Учёт транзакций (расходов/доходов)
- Цели накоплений с прогрессом
- Уведомления в Telegram при превышении лимитов и достижении целей

### Технологический стек
- **Язык:** TypeScript
- **Runtime:** Node.js
- **База данных:** PostgreSQL
- **Брокер сообщений:** RabbitMQ
- **Внешний API:** Telegram Bot API
- **Аутентификация:** JWT (access + refresh tokens)
- **Контейнеризация:** Docker, docker-compose

---

## Архитектура

Гибридный подход: монолит с модулями + отдельный сервис уведомлений.

```
┌─────────────────────────────────────────────────────┐
│                      nginx:80                        │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Main API (монолит)                      │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │   Auth   │ Budgets  │  Goals   │Transactions│    │
│  └──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────┬───────────────────────────────┘
                      │ publish events
┌─────────────────────▼───────────────────────────────┐
│                   RabbitMQ                           │
└─────────────────────┬───────────────────────────────┘
                      │ consume
┌─────────────────────▼───────────────────────────────┐
│           Notification Service                       │
│              (Telegram Bot)                          │
└─────────────────────────────────────────────────────┘
```

### Контейнеры (docker-compose)
1. **postgres** — база данных
2. **rabbitmq** — брокер сообщений
3. **api** — основной сервис
4. **notifications** — сервис уведомлений
5. **nginx** — reverse proxy (единственный открытый порт 80)

---

## Схема базы данных

7 таблиц:

### users
| Поле | Тип |
|------|-----|
| id | PK, UUID |
| email | VARCHAR, UNIQUE |
| password_hash | VARCHAR |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### categories
| Поле | Тип |
|------|-----|
| id | PK, UUID |
| user_id | FK → users |
| name | VARCHAR |
| icon | VARCHAR |
| is_default | BOOLEAN |

### budgets
| Поле | Тип |
|------|-----|
| id | PK, UUID |
| user_id | FK → users |
| month | INTEGER (1-12) |
| year | INTEGER |
| created_at | TIMESTAMP |

UNIQUE INDEX: (user_id, month, year)

### budget_limits
| Поле | Тип |
|------|-----|
| id | PK, UUID |
| budget_id | FK → budgets |
| category_id | FK → categories |
| limit_amount | DECIMAL |

### transactions
| Поле | Тип |
|------|-----|
| id | PK, UUID |
| user_id | FK → users |
| category_id | FK → categories |
| amount | DECIMAL |
| type | ENUM (income, expense) |
| description | VARCHAR |
| date | DATE |
| created_at | TIMESTAMP |

### goals
| Поле | Тип |
|------|-----|
| id | PK, UUID |
| user_id | FK → users |
| name | VARCHAR |
| target_amount | DECIMAL |
| current_amount | DECIMAL |
| deadline | DATE |
| created_at | TIMESTAMP |

### notification_settings
| Поле | Тип |
|------|-----|
| id | PK, UUID |
| user_id | FK → users, UNIQUE |
| telegram_chat_id | VARCHAR |
| notify_limit_exceeded | BOOLEAN |
| notify_goal_reached | BOOLEAN |
| created_at | TIMESTAMP |

---

## Структура проекта

```
budget-app/
├── docker-compose.yml
├── .env.example
│
├── api/                          # Основной сервис (монолит)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── main.ts               # Entry point, graceful shutdown
│   │   │
│   │   ├── config/               # Конфигурационный модуль (env)
│   │   │   └── index.ts
│   │   │
│   │   ├── shared/               # Общие компоненты
│   │   │   ├── middleware/
│   │   │   │   ├── correlation-id.ts
│   │   │   │   ├── request-counter.ts
│   │   │   │   └── auth.ts
│   │   │   ├── decorators/
│   │   │   │   └── latency-histogram.ts
│   │   │   ├── logger/
│   │   │   └── database/
│   │   │       └── migrations/
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/             # Модуль аутентификации
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── api/
│   │   │   │
│   │   │   ├── budgets/          # Модуль бюджетов
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── api/
│   │   │   │
│   │   │   ├── transactions/     # Модуль транзакций
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── goals/            # Модуль целей
│   │   │       └── ...
│   │   │
│   │   └── swagger/              # OpenAPI документация
│   │
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── notifications/                # Сервис уведомлений
│   ├── Dockerfile
│   ├── src/
│   │   ├── main.ts
│   │   ├── config/
│   │   ├── rabbitmq/
│   │   └── telegram/
│   └── tests/
│
└── nginx/
    ├── Dockerfile
    └── nginx.conf
```

---

## API Endpoints

### Auth
```
POST   /api/auth/register     # Регистрация
POST   /api/auth/login        # Вход
POST   /api/auth/refresh      # Обновление токенов
POST   /api/auth/logout       # Выход
GET    /api/auth/me           # Текущий пользователь
```

### Budgets
```
GET    /api/budgets                  # Список бюджетов
POST   /api/budgets                  # Создать бюджет
GET    /api/budgets/:id              # Получить бюджет
GET    /api/budgets/current          # Текущий месяц
DELETE /api/budgets/:id              # Удалить

POST   /api/budgets/:id/limits       # Добавить лимит
PUT    /api/budgets/:id/limits/:lid  # Изменить лимит
DELETE /api/budgets/:id/limits/:lid  # Удалить лимит
```

### Categories
```
GET    /api/categories         # Список категорий
POST   /api/categories         # Создать
PUT    /api/categories/:id     # Изменить
DELETE /api/categories/:id     # Удалить
```

### Transactions
```
GET    /api/transactions             # Список с фильтрами
POST   /api/transactions             # Создать
GET    /api/transactions/:id         # Получить
PUT    /api/transactions/:id         # Изменить
DELETE /api/transactions/:id         # Удалить
GET    /api/transactions/stats       # Статистика
```

### Goals
```
GET    /api/goals              # Список целей
POST   /api/goals              # Создать
GET    /api/goals/:id          # Получить
PUT    /api/goals/:id          # Изменить
DELETE /api/goals/:id          # Удалить
POST   /api/goals/:id/deposit  # Внести сумму
```

### Notifications
```
GET    /api/notifications/settings   # Настройки
PUT    /api/notifications/settings   # Обновить
POST   /api/notifications/test       # Тест
```

### System
```
GET    /health                 # Healthcheck
GET    /metrics                # Prometheus метрики
```

---

## События и уведомления

### RabbitMQ события

Exchange: `budget.events`

```typescript
// При создании транзакции
{
  type: 'TRANSACTION_CREATED',
  payload: {
    userId: string,
    categoryId: string,
    amount: number,
    budgetId: string,
    currentSpent: number,
    limitAmount: number
  }
}

// При внесении в цель
{
  type: 'GOAL_DEPOSIT',
  payload: {
    userId: string,
    goalId: string,
    goalName: string,
    currentAmount: number,
    targetAmount: number
  }
}
```

### Логика уведомлений
- `currentSpent >= limitAmount * 0.8` → предупреждение 80%
- `currentSpent >= limitAmount` → превышение лимита
- `currentAmount >= targetAmount` → цель достигнута

### Подключение Telegram
1. Пользователь начинает чат с ботом `/start`
2. Получает код привязки
3. Вводит код в настройках → сохраняется `telegram_chat_id`

---

## Middleware и метрики

### Middleware стек
1. **correlationIdMiddleware** — создаёт/читает X-Correlation-ID
2. **requestCounterMiddleware** — считает запросы по статусам
3. **authMiddleware** — проверяет JWT

### Формат логов
```
[abc-123-def] INFO: User registered { email: "test@mail.com" }
```

### Метрики (Prometheus-style)
```
http_requests_total
http_requests_2xx_total
http_requests_4xx_total
http_requests_5xx_total

db_query_duration_seconds_bucket{le="0.005"}
db_query_duration_seconds_sum
db_query_duration_seconds_count
```

### Latency Histogram Decorator
```typescript
@LatencyHistogram('database')
async findUserById(id: string): Promise<User>
```

---

## Docker конфигурация

### Требования
- Все контейнеры запускаются не из-под root (`user: "1000:1000"`)
- Healthcheck на все контейнеры
- Multi-stage build (без исходников в production)
- Только порт 80 открыт наружу (nginx)
- Volume для данных PostgreSQL
- Volume для связи с кодом (dev)

### Порядок запуска
1. postgres (healthcheck: pg_isready)
2. rabbitmq (healthcheck: rabbitmq-diagnostics)
3. api (depends_on: postgres, rabbitmq)
4. notifications (depends_on: rabbitmq)
5. nginx (depends_on: api)

---

## Тестирование

### Покрытие: минимум 40%

### Unit тесты
- budget.service.spec.ts
- transaction.service.spec.ts
- goal.service.spec.ts
- auth.service.spec.ts

### Integration тесты
- auth.spec.ts
- budget.spec.ts
- transaction.spec.ts
- health.spec.ts (пустой endpoint → 200)

### Стек
- Jest — test runner
- Supertest — HTTP assertions
- Testcontainers — PostgreSQL в Docker

### Критичная бизнес-логика
1. Расчёт потраченного в категории за месяц
2. Проверка превышения лимита
3. Расчёт прогресса цели
4. JWT access/refresh flow

---

## Безопасность

| Угроза | Защита |
|--------|--------|
| SQL Injection | Parameterized queries (ORM) |
| XSS | Валидация input, sanitize output |
| CSRF | JWT в Authorization header |
| Brute force | Rate limiting на /auth/* |
| Password leak | bcrypt hashing (10+ rounds) |

### Валидация
- class-validator + class-transformer для DTO
- Все входные данные валидируются на уровне API

---

## Технологии

| Компонент | Технология |
|-----------|------------|
| Runtime | Node.js 20 |
| Язык | TypeScript |
| HTTP Framework | Fastify или Express |
| ORM | Prisma или TypeORM |
| Валидация | class-validator |
| Логирование | pino |
| Тесты | Jest, Supertest, Testcontainers |
| Документация | Swagger/OpenAPI |
| Линтер | ESLint |
