# План верификации приложения Budget App

**Дата:** 2026-01-19
**Статус:** Ожидает выполнения

---

## 1. Цели верификации

1. **Инфраструктура** — проверить запуск всех сервисов в dev и prod режимах
2. **API функциональность** — проверить все endpoints по ТЗ
3. **Интеграции** — проверить RabbitMQ события и Telegram уведомления
4. **End-to-End** — проверить полные пользовательские сценарии

---

## 2. Верификация Development режима

### 2.1 Запуск инфраструктуры

```bash
# Команда запуска
docker compose up -d postgres-api postgres-notifications rabbitmq
```

| Проверка | Команда | Ожидаемый результат |
|----------|---------|---------------------|
| PostgreSQL API запущен | `docker compose ps postgres-api` | Status: healthy |
| PostgreSQL Notifications запущен | `docker compose ps postgres-notifications` | Status: healthy |
| RabbitMQ запущен | `docker compose ps rabbitmq` | Status: healthy |
| Порты доступны | `nc -zv localhost 5432 5433 5673` | Connection succeeded |

### 2.2 Миграции и генерация

```bash
cd api && bunx prisma migrate dev && bunx prisma generate && cd ..
cd notifications && bunx prisma migrate dev && bunx prisma generate && cd ..
```

| Проверка | Критерий |
|----------|----------|
| API миграции применены | Нет ошибок, таблицы созданы |
| Notifications миграции применены | Нет ошибок, таблицы созданы |
| Prisma клиенты сгенерированы | Нет ошибок при generate |

### 2.3 Запуск сервисов

```bash
npm run api:dev &
npm run notifications:dev &
```

| Проверка | Команда | Ожидаемый результат |
|----------|---------|---------------------|
| API health | `curl http://localhost:3000/health` | `{"status":"ok"}` |
| Notifications health | `curl http://localhost:3001/health` | `{"status":"ok"}` |
| API metrics | `curl http://localhost:3000/metrics` | Prometheus формат |

---

## 3. Верификация Production режима

### 3.1 Сборка образов

```bash
docker compose -f docker-compose.prod.yml build
```

| Проверка | Критерий |
|----------|----------|
| API образ собран | Нет ошибок сборки |
| Notifications образ собран | Нет ошибок сборки |
| Nginx образ собран | Нет ошибок сборки |

### 3.2 Запуск production

```bash
docker compose -f docker-compose.prod.yml up -d
```

| Проверка | Команда | Ожидаемый результат |
|----------|---------|---------------------|
| Все контейнеры running | `docker compose -f docker-compose.prod.yml ps` | Все Up (healthy) |
| API доступен через Nginx | `curl http://localhost/api/health` | `{"status":"ok"}` |
| Логи без ошибок | `docker compose -f docker-compose.prod.yml logs --tail=50` | Нет ERROR |

### 3.3 Остановка и очистка

```bash
docker compose -f docker-compose.prod.yml down
```

| Проверка | Критерий |
|----------|----------|
| Контейнеры остановлены | Все контейнеры removed |
| Volumes сохранены | `docker volume ls` показывает volumes |

---

## 4. Функциональное тестирование API

### 4.1 Auth модуль

#### Регистрация

```bash
# Успешная регистрация
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешная регистрация | 201, `{user, tokens}` |
| Дублирование email | 409, `CONFLICT` |
| Невалидный email | 400, `VALIDATION_FAILED` |
| Короткий пароль | 400, `VALIDATION_FAILED` |

#### Логин

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешный логин | 200, `{user, tokens}` |
| Неверный пароль | 401, `INVALID_CREDENTIALS` |
| Несуществующий email | 401, `INVALID_CREDENTIALS` |

#### Refresh токенов

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<token>"}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешный refresh | 200, новая пара токенов |
| Невалидный токен | 401, `INVALID_TOKEN` |
| Повторное использование | 401, токен одноразовый |

#### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<token>"}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешный logout | 204 |
| Токен удалён из БД | Повторный refresh невозможен |

### 4.2 Categories модуль

#### Получение категорий (после регистрации)

```bash
curl http://localhost:3000/categories \
  -H "Authorization: Bearer <access_token>"
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Дефолтные категории созданы | 200, массив с isDefault=true |
| Фильтрация по userId | Только свои категории |

#### Создание категории

```bash
curl -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Путешествия","icon":"✈️"}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешное создание | 201, `{id, name, icon}` |
| Дублирование имени | 409, `CATEGORY_ALREADY_EXISTS` |

#### Удаление категории

```bash
curl -X DELETE http://localhost:3000/categories/<id> \
  -H "Authorization: Bearer <access_token>"
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешное удаление | 204 |
| Категория с транзакциями | 409, `CATEGORY_HAS_TRANSACTIONS` |
| Чужая категория | 404, `CATEGORY_NOT_FOUND` |

### 4.3 Transactions модуль

#### Создание транзакции

```bash
curl -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId":"<category_id>",
    "amount":1500,
    "type":"EXPENSE",
    "description":"Покупка продуктов",
    "date":"2026-01-19"
  }'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешное создание EXPENSE | 201, транзакция создана |
| Успешное создание INCOME | 201, транзакция создана |
| Невалидный categoryId | 404, `CATEGORY_NOT_FOUND` |
| Чужая категория | 404, `CATEGORY_NOT_FOUND` |
| Отрицательный amount | 400, `VALIDATION_FAILED` |
| Невалидный type | 400, `VALIDATION_FAILED` |

#### Получение транзакций

```bash
# Все транзакции
curl http://localhost:3000/transactions \
  -H "Authorization: Bearer <access_token>"

# С фильтрами
curl "http://localhost:3000/transactions?type=EXPENSE&startDate=2026-01-01" \
  -H "Authorization: Bearer <access_token>"
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Список транзакций | 200, массив транзакций |
| Фильтр по type | Только EXPENSE или INCOME |
| Фильтр по дате | Транзакции в диапазоне |
| Только свои | Нет чужих транзакций |

#### Обновление/Удаление

| Тест | Ожидаемый результат |
|------|---------------------|
| Обновление своей | 200, обновлённая транзакция |
| Обновление чужой | 404, `TRANSACTION_NOT_FOUND` |
| Удаление своей | 204 |
| Удаление чужой | 404, `TRANSACTION_NOT_FOUND` |

### 4.4 Budgets модуль

#### Создание/получение бюджета

```bash
curl -X POST "http://localhost:3000/budgets/current?month=1&year=2026" \
  -H "Authorization: Bearer <access_token>"
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Создание бюджета | 200, `{id, month, year, limits:[]}` |
| Повторный запрос | 200, тот же бюджет (уникальность) |
| Невалидный month | 400, month 1-12 |

#### Установка лимита

```bash
curl -X POST "http://localhost:3000/budgets/current/limits?month=1&year=2026" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"<category_id>","limitAmount":10000}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Создание лимита | 201, лимит создан |
| Обновление лимита | 201, лимит обновлён |
| Чужая категория | 404, `CATEGORY_NOT_FOUND` |

### 4.5 Goals модуль

#### Создание цели

```bash
curl -X POST http://localhost:3000/goals \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Отпуск","targetAmount":100000}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешное создание | 201, `{id, name, targetAmount, currentAmount:0}` |
| С deadline | 201, deadline сохранён |
| Отрицательный target | 400, `VALIDATION_FAILED` |

#### Депозит

```bash
curl -X POST http://localhost:3000/goals/<id>/deposit \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешный депозит | 200, currentAmount увеличен |
| Отрицательный amount | 400, `VALIDATION_FAILED` |
| Нулевой amount | 400, `INVALID_DEPOSIT_AMOUNT` |

---

## 5. Интеграционное тестирование

### 5.1 RabbitMQ события

#### Событие TRANSACTION_CREATED (при превышении лимита)

**Сценарий:**
1. Создать бюджет на текущий месяц
2. Установить лимит 1000 на категорию
3. Создать транзакцию EXPENSE на 1500

**Проверка:**
```bash
# Логи notifications сервиса
docker compose logs notifications | grep "Budget limit exceeded"
```

| Проверка | Ожидаемый результат |
|----------|---------------------|
| Событие опубликовано | Лог в API: "Budget limit exceeded event published" |
| Событие получено | Лог в Notifications: "Event received" |

#### Событие GOAL_DEPOSIT (при достижении цели)

**Сценарий:**
1. Создать цель с targetAmount=1000
2. Сделать депозит на 1000

**Проверка:**
```bash
docker compose logs notifications | grep "Goal reached"
```

| Проверка | Ожидаемый результат |
|----------|---------------------|
| Событие опубликовано | Лог в API: "Goal reached event published" |
| Событие получено | Лог в Notifications: "Event received" |

### 5.2 Telegram уведомления

**Предварительные условия:**
1. Telegram бот создан и токен в `.env`
2. Пользователь отправил `/start` боту
3. chatId привязан к пользователю

#### Привязка Telegram

```bash
curl -X POST http://localhost:3001/settings/telegram/link \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"<telegram_chat_id>"}'
```

| Тест | Ожидаемый результат |
|------|---------------------|
| Успешная привязка | 200, telegramChatId сохранён |

#### Уведомление о превышении лимита

**Сценарий:** (после привязки Telegram)
1. Установить лимит на категорию
2. Превысить лимит транзакцией

| Проверка | Ожидаемый результат |
|----------|---------------------|
| Сообщение отправлено | Telegram сообщение получено |
| Формат сообщения | "Budget Limit Exceeded!" + детали |

#### Уведомление о достижении цели

**Сценарий:**
1. Создать цель
2. Достичь цели депозитом

| Проверка | Ожидаемый результат |
|----------|---------------------|
| Сообщение отправлено | Telegram сообщение получено |
| Формат сообщения | "Goal Reached!" + детали |

---

## 6. End-to-End сценарии

### 6.1 Сценарий: Новый пользователь

```
1. Регистрация → получение токенов
2. Проверка дефолтных категорий → 5+ категорий
3. Создание своей категории → успех
4. Создание транзакции → успех
5. Создание бюджета → успех
6. Установка лимита → успех
7. Создание цели → успех
8. Депозит в цель → успех
9. Logout → токен инвалидирован
```

### 6.2 Сценарий: Месячный бюджет

```
1. Логин
2. Создать бюджет на январь 2026
3. Установить лимит 10000 на "Продукты"
4. Создать 3 транзакции EXPENSE по 3000
5. Проверить что лимит достигнут
6. Создать ещё транзакцию → превышение
7. Проверить Telegram уведомление
```

### 6.3 Сценарий: Накопление на цель

```
1. Логин
2. Создать цель "Отпуск" на 50000
3. Сделать 5 депозитов по 10000
4. Проверить что цель достигнута
5. Проверить Telegram уведомление
```

---

## 7. Чек-лист выполнения

### Development режим

- [ ] Инфраструктура запускается
- [ ] Миграции применяются
- [ ] API health check проходит
- [ ] Notifications health check проходит

### Production режим

- [ ] Образы собираются
- [ ] Контейнеры запускаются
- [ ] Health checks проходят
- [ ] Nginx проксирует корректно

### Функциональность

- [ ] Auth: register/login/refresh/logout
- [ ] Categories: CRUD + дефолтные
- [ ] Transactions: CRUD + валидация
- [ ] Budgets: CRUD + лимиты
- [ ] Goals: CRUD + депозиты

### Интеграции

- [ ] RabbitMQ события публикуются
- [ ] RabbitMQ события обрабатываются
- [ ] Telegram привязка работает
- [ ] Telegram уведомления отправляются

### E2E сценарии

- [ ] Новый пользователь
- [ ] Месячный бюджет с превышением
- [ ] Накопление на цель

---

## 8. Команды для тестирования

### Быстрая проверка (smoke test)

```bash
# 1. Запуск инфраструктуры
docker compose up -d postgres-api postgres-notifications rabbitmq
sleep 10

# 2. Миграции
cd api && bunx prisma migrate dev && cd ..
cd notifications && bunx prisma migrate dev && cd ..

# 3. Запуск сервисов (в отдельных терминалах)
npm run api:dev
npm run notifications:dev

# 4. Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health

# 5. Регистрация тестового пользователя
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"password123"}'
```

### Production smoke test

```bash
# 1. Сборка и запуск
docker compose -f docker-compose.prod.yml up -d --build

# 2. Ожидание готовности (30-60 сек)
sleep 60

# 3. Проверка
curl http://localhost/api/health

# 4. Остановка
docker compose -f docker-compose.prod.yml down
```

---

*План создан: 2026-01-19*
