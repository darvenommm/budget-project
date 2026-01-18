# Разделение баз данных для микросервисов

**Дата:** 2026-01-17
**Цель:** Изоляция данных — сервисы не должны иметь прямой доступ к данным друг друга

---

## 1. Целевая архитектура

### Разделение владения данными

| База данных | Сервис | Таблицы |
|-------------|--------|---------|
| `budget_api` | API | `users`, `refresh_tokens`, `categories`, `budgets`, `budget_limits`, `transactions`, `goals` |
| `budget_notifications` | Notifications | `notification_settings` |

### Принципы взаимодействия

- Notifications **не имеет** прямого доступа к `budget_api`
- API **не имеет** прямого доступа к `budget_notifications`
- Вся коммуникация через RabbitMQ события (уже реализовано)
- `user_id` передаётся в событиях — FK на `users` в Notifications БД убирается

### Что меняется

- Таблица `notification_settings` теряет FK constraint на `users`
- `user_id` остаётся как обычное поле (UUID), но без внешнего ключа
- Notifications сервис получает свой отдельный `DATABASE_URL`

---

## 2. Изменения в Prisma-схемах

### API сервис (`api/prisma/schema.prisma`)

Удалить модель `NotificationSettings` — она больше не принадлежит этому сервису:

```prisma
// УДАЛИТЬ из api/prisma/schema.prisma:
model NotificationSettings {
  id                  String  @id @default(uuid())
  userId              String  @unique @map("user_id")
  telegramChatId      String? @map("telegram_chat_id")
  notifyLimitExceeded Boolean @default(true) @map("notify_limit_exceeded")
  notifyGoalReached   Boolean @default(true) @map("notify_goal_reached")
  user                User    @relation(...)

  @@map("notification_settings")
}
```

### Notifications сервис (`notifications/prisma/schema.prisma`)

Оставить только `NotificationSettings`, убрать FK на `User`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model NotificationSettings {
  id                  String  @id @default(uuid())
  userId              String  @unique @map("user_id")  // без @relation!
  telegramChatId      String? @map("telegram_chat_id")
  notifyLimitExceeded Boolean @default(true) @map("notify_limit_exceeded")
  notifyGoalReached   Boolean @default(true) @map("notify_goal_reached")

  @@map("notification_settings")
}
```

---

## 3. Изменения в инфраструктуре (Docker)

### docker-compose.yml — два контейнера PostgreSQL

```yaml
services:
  postgres-api:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: budget_api
    volumes:
      - postgres_api_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d budget_api"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal

  postgres-notifications:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: budget_notifications
    volumes:
      - postgres_notifications_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d budget_notifications"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal

  api:
    # ... существующая конфигурация ...
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-api:5432/budget_api
    depends_on:
      postgres-api:
        condition: service_healthy

  notifications:
    # ... существующая конфигурация ...
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-notifications:5432/budget_notifications
    depends_on:
      postgres-notifications:
        condition: service_healthy

volumes:
  postgres_api_data:
  postgres_notifications_data:
```

### Переменные окружения (.env)

```bash
# Общие
DB_USER=budget
DB_PASSWORD=budget

# API сервис
API_DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres-api:5432/budget_api

# Notifications сервис
NOTIFICATIONS_DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres-notifications:5432/budget_notifications
```

---

## 4. Изменения в коде сервисов

### API сервис

1. **Удалить модуль notifications** (`api/src/modules/notifications/`)
   - API больше не управляет `notification_settings`
   - Эндпоинты настроек уведомлений переносятся в Notifications сервис

2. **Убрать связь User → NotificationSettings** из Prisma-схемы

3. **События остаются без изменений** — уже содержат всю нужную информацию

### Notifications сервис

1. **Добавить REST API** для управления `notification_settings`:
   - `GET /settings` — получить настройки текущего пользователя
   - `PUT /settings` — обновить настройки
   - `POST /settings/telegram` — привязать Telegram

2. **Добавить JWT-валидацию** — извлекать `userId` из токена (как в API сервисе)

3. **Обновить Prisma-схему** — только `NotificationSettings` без FK

### Nginx

Добавить маршрутизацию на Notifications сервис:

```nginx
upstream notifications {
    server notifications:3001;
}

server {
    # ... существующая конфигурация ...

    location /api/notifications/ {
        proxy_pass http://notifications/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Correlation-ID $request_id;
    }
}
```

---

## 5. Порядок реализации

### Фаза 1: Инфраструктура
- [ ] Обновить `docker-compose.yml` — два контейнера PostgreSQL
- [ ] Обновить `.env.example` — раздельные `DATABASE_URL`
- [ ] Проверить запуск контейнеров

### Фаза 2: Prisma-схемы
- [ ] Упростить `notifications/prisma/schema.prisma` — только `NotificationSettings`
- [ ] Убрать `NotificationSettings` из `api/prisma/schema.prisma`
- [ ] Запустить миграции для обеих баз

### Фаза 3: API сервис
- [ ] Удалить модуль `notifications` из API
- [ ] Убрать связанные роуты из регистрации
- [ ] Проверить сборку и тесты API

### Фаза 4: Notifications сервис
- [ ] Добавить JWT-валидацию (middleware)
- [ ] Создать REST API для `notification_settings`
- [ ] Обновить Nginx конфигурацию
- [ ] Проверить сборку и тесты Notifications

### Фаза 5: Интеграция
- [ ] Полный end-to-end тест
- [ ] Проверить события через RabbitMQ

---

## 6. Диаграмма целевой архитектуры

```
┌─────────────────────────────────────────────────────────────────┐
│                           Nginx :8080                           │
│                    (reverse proxy + routing)                    │
└──────────────────────┬────────────────────┬─────────────────────┘
                       │                    │
                       ▼                    ▼
              ┌────────────────┐   ┌────────────────────┐
              │   API :3000    │   │ Notifications :3001│
              │                │   │                    │
              │  - auth        │   │  - settings API    │
              │  - transactions│   │  - event consumer  │
              │  - budgets     │   │  - telegram sender │
              │  - categories  │   │                    │
              │  - goals       │   │                    │
              └───────┬────────┘   └─────────┬──────────┘
                      │                      │
                      │    ┌─────────────┐   │
                      │    │  RabbitMQ   │   │
                      └───►│   :5672     │◄──┘
                           │  (events)   │
                           └─────────────┘
                      │                      │
                      ▼                      ▼
              ┌────────────────┐   ┌────────────────────┐
              │ postgres-api   │   │postgres-notifications│
              │    :5432       │   │       :5432        │
              │                │   │                    │
              │  - users       │   │  - notification_   │
              │  - tokens      │   │    settings        │
              │  - categories  │   │                    │
              │  - budgets     │   │                    │
              │  - transactions│   │                    │
              │  - goals       │   │                    │
              └────────────────┘   └────────────────────┘
```
