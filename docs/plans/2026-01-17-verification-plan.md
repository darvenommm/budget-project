# BudgetApp - План проверки работоспособности

> **Цель:** Проверить соответствие реализации требованиям из design документа.

---

## Фаза 1: Проверка сборки

### 1.1 TypeScript компиляция API

**Команда:**
```bash
cd api && npx tsc --noEmit
```

**Ожидаемый результат:** 0 ошибок

**Проверяет:** Корректность типов во всех модулях (auth, budgets, categories, transactions, goals, notifications)

---

### 1.2 TypeScript компиляция Notifications

**Команда:**
```bash
cd notifications && npx tsc --noEmit
```

**Ожидаемый результат:** 0 ошибок

**Проверяет:** Корректность типов в сервисе уведомлений (rabbitmq consumer, telegram service)

---

### 1.3 Build API

**Команда:**
```bash
cd api && bun run build
```

**Ожидаемый результат:** Успешная сборка, файлы в `dist/`

---

### 1.4 Build Notifications

**Команда:**
```bash
cd notifications && bun run build
```

**Ожидаемый результат:** Успешная сборка, файлы в `dist/`

---

## Фаза 2: Запуск тестов

### 2.1 Unit тесты

**Команда:**
```bash
cd api && bun test tests/unit
```

**Файлы тестов:**
- `tests/unit/auth.service.spec.ts`
- `tests/unit/goal.service.spec.ts`
- `tests/unit/notification-settings.service.spec.ts`

**Ожидаемый результат:** Все тесты проходят

**Проверяет по design:**
- JWT access/refresh flow
- Расчёт прогресса цели
- Настройки уведомлений

---

### 2.2 Integration тесты

**Команда:**
```bash
cd api && bun test tests/integration
```

**Требования:** Docker для Testcontainers (PostgreSQL + RabbitMQ)

**Файлы тестов:**
- `tests/integration/health.spec.ts`

**Ожидаемый результат:** Все тесты проходят

**Проверяет по design:**
- Endpoint `/health` возвращает `{ status: "ok" }`
- Correlation-ID header работает

---

### 2.3 Покрытие тестами

**Команда:**
```bash
cd api && bun test --coverage
```

**Требование из design:** минимум 40% покрытие

**Проверить модули:**
- `auth.service` - критичная бизнес-логика
- `goal.service` - расчёт прогресса
- `transaction.service` - расчёт потраченного в категории

---

## Фаза 3: Проверка Docker

### 3.1 Сборка образов

**Команда:**
```bash
docker-compose build
```

**Ожидаемый результат:** Все 5 образов собираются без ошибок
- postgres (из image)
- rabbitmq (из image)
- api (Dockerfile)
- notifications (Dockerfile)
- nginx (Dockerfile)

---

### 3.2 Запуск контейнеров

**Подготовка:**
```bash
cp .env.example .env
# Заполнить переменные JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (мин 32 символа)
# TELEGRAM_BOT_TOKEN (для уведомлений)
```

**Команда:**
```bash
docker-compose up -d
```

**Проверки по design:**
1. Все контейнеры запускаются не из-под root (`user: "1000:1000"`)
2. Healthcheck на все контейнеры
3. Только порт 80 открыт наружу (nginx)

**Команда проверки:**
```bash
docker-compose ps
docker-compose logs api
```

---

### 3.3 Healthcheck

**Команды:**
```bash
curl http://localhost/health
curl http://localhost:3000/health  # внутри docker network
```

**Ожидаемый результат:** `{"status":"ok"}`

---

## Фаза 4: Проверка API Endpoints

### 4.1 Auth Module

**Требования из design:**

| Endpoint | Метод | Проверка |
|----------|-------|----------|
| `/api/auth/register` | POST | Регистрация нового пользователя, возврат tokens |
| `/api/auth/login` | POST | Вход, возврат access + refresh tokens |
| `/api/auth/refresh` | POST | Обновление токенов |
| `/api/auth/logout` | POST | Выход, инвалидация refresh token |
| `/api/auth/me` | GET | Текущий пользователь (требует auth) |

**Тестовые запросы:**
```bash
# Регистрация
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Логин
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Me (с токеном)
curl http://localhost/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

### 4.2 Categories Module

| Endpoint | Метод | Проверка |
|----------|-------|----------|
| `/api/categories` | GET | Список категорий пользователя |
| `/api/categories` | POST | Создание категории |
| `/api/categories/:id` | PUT | Изменение категории |
| `/api/categories/:id` | DELETE | Удаление (если нет транзакций) |

---

### 4.3 Budgets Module

| Endpoint | Метод | Проверка |
|----------|-------|----------|
| `/api/budgets` | GET | Список бюджетов |
| `/api/budgets` | POST | Создать бюджет |
| `/api/budgets/:id` | GET | Получить бюджет |
| `/api/budgets/current` | GET | Текущий месяц |
| `/api/budgets/:id` | DELETE | Удалить |
| `/api/budgets/:id/limits` | POST | Добавить лимит |
| `/api/budgets/:id/limits/:lid` | PUT | Изменить лимит |
| `/api/budgets/:id/limits/:lid` | DELETE | Удалить лимит |

---

### 4.4 Transactions Module

| Endpoint | Метод | Проверка |
|----------|-------|----------|
| `/api/transactions` | GET | Список с фильтрами |
| `/api/transactions` | POST | Создать транзакцию |
| `/api/transactions/:id` | GET | Получить |
| `/api/transactions/:id` | PUT | Изменить |
| `/api/transactions/:id` | DELETE | Удалить |
| `/api/transactions/stats` | GET | Статистика |

**Критичная бизнес-логика:**
- Расчёт потраченного в категории за месяц
- Проверка превышения лимита
- Публикация события в RabbitMQ при создании

---

### 4.5 Goals Module

| Endpoint | Метод | Проверка |
|----------|-------|----------|
| `/api/goals` | GET | Список целей |
| `/api/goals` | POST | Создать |
| `/api/goals/:id` | GET | Получить |
| `/api/goals/:id` | PUT | Изменить |
| `/api/goals/:id` | DELETE | Удалить |
| `/api/goals/:id/deposit` | POST | Внести сумму |

**Критичная бизнес-логика:**
- Расчёт прогресса цели (`currentAmount / targetAmount`)
- Публикация события при достижении цели

---

### 4.6 Notifications Module

| Endpoint | Метод | Проверка |
|----------|-------|----------|
| `/api/notifications/settings` | GET | Настройки |
| `/api/notifications/settings` | PUT | Обновить |
| `/api/notifications/test` | POST | Тестовое уведомление |

---

### 4.7 System Endpoints

| Endpoint | Метод | Проверка |
|----------|-------|----------|
| `/health` | GET | `{"status":"ok"}` |
| `/metrics` | GET | Prometheus-style метрики |

**Проверка метрик:**
```bash
curl http://localhost/metrics
```

**Ожидаемый формат:**
```
http_requests_total <number>
http_requests_2xx_total <number>
http_requests_4xx_total <number>
http_requests_5xx_total <number>
```

---

## Фаза 5: Проверка Middleware

### 5.1 Correlation-ID

**Тест:**
```bash
curl -H "X-Correlation-ID: test-123" http://localhost/health -v
```

**Ожидание:** Response header `X-Correlation-ID: test-123`

---

### 5.2 Request Counter

**Тест:**
1. Сделать несколько запросов
2. Проверить `/metrics`

**Ожидание:** Счётчики увеличиваются корректно

---

## Фаза 6: Проверка RabbitMQ интеграции

### 6.1 События транзакций

**Сценарий:**
1. Создать бюджет с лимитом на категорию
2. Создать транзакцию, превышающую 80% лимита
3. Проверить, что событие `TRANSACTION_CREATED` опубликовано

**Логи notifications сервиса:**
```bash
docker-compose logs -f notifications
```

---

### 6.2 События целей

**Сценарий:**
1. Создать цель с `targetAmount: 1000`
2. Внести `deposit: 1000`
3. Проверить событие `GOAL_DEPOSIT`

---

## Фаза 7: Проверка базы данных

### 7.1 Prisma схема

**Команда:**
```bash
cd api && npx prisma validate
```

**Ожидание:** Schema is valid

---

### 7.2 Миграции

**Команда:**
```bash
cd api && npx prisma migrate status
```

**Ожидание:** Все миграции применены

---

## Фаза 8: Проверка безопасности (по design)

| Угроза | Что проверить |
|--------|---------------|
| SQL Injection | Prisma ORM использует parameterized queries |
| CSRF | JWT в Authorization header (не cookie) |
| Brute force | Rate limiting на /auth/* (если реализовано) |
| Password leak | bcrypt hashing (или Bun.password) |

---

## Чек-лист проверки

- [ ] TypeScript компиляция API (0 ошибок)
- [ ] TypeScript компиляция Notifications (0 ошибок)
- [ ] Build API успешен
- [ ] Build Notifications успешен
- [ ] Unit тесты проходят
- [ ] Integration тесты проходят
- [ ] Покрытие тестами >= 40%
- [ ] Docker образы собираются
- [ ] Docker-compose запускается
- [ ] Healthcheck работает
- [ ] Auth endpoints работают
- [ ] Categories endpoints работают
- [ ] Budgets endpoints работают
- [ ] Transactions endpoints работают
- [ ] Goals endpoints работают
- [ ] Notifications endpoints работают
- [ ] Metrics endpoint работает
- [ ] Correlation-ID middleware работает
- [ ] RabbitMQ события публикуются
- [ ] Prisma схема валидна

---

## Резюме

**Общее количество проверок:** ~25

**Критические проверки (блокируют релиз):**
1. TypeScript компиляция без ошибок
2. Unit тесты проходят
3. Docker контейнеры запускаются
4. Auth flow работает
5. Health endpoint возвращает 200
