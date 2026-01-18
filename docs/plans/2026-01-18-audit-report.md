# Отчёт аудита качества кода

**Дата:** 2026-01-18
**Фаза:** 1 (Аудит)

---

## 1. TypeScript компиляция

### api/
**Статус:** ✅ Проходит без ошибок

### notifications/
**Статус:** ❌ 4 ошибки

| Файл | Ошибка | Приоритет |
|------|--------|-----------|
| `src/settings/infrastructure/prisma-settings.repository.ts:10` | Type missing `createdAt`, `updatedAt` | Критичный |
| `src/settings/infrastructure/prisma-settings.repository.ts:14` | Type missing `createdAt`, `updatedAt` | Критичный |
| `src/settings/infrastructure/prisma-settings.repository.ts:20` | Type missing `createdAt`, `updatedAt` | Критичный |
| `src/settings/infrastructure/prisma-settings.repository.ts:27` | Type missing `createdAt`, `updatedAt` | Критичный |

**Причина:** Тип `NotificationSettings` не соответствует возвращаемому типу Prisma.

---

## 2. ESLint

### api/
**Всего:** 2 errors, 3 warnings

| Файл | Правило | Тип |
|------|---------|-----|
| `src/shared/middleware/validation.ts:5,20,35` | `@typescript-eslint/explicit-function-return-type` | Warning |
| `tests/integration/transactions.spec.ts:1` | `@typescript-eslint/no-unused-vars` (beforeEach) | Error |
| `tests/integration/transactions.spec.ts:6` | `@typescript-eslint/no-unused-vars` (prisma) | Error |

### notifications/
**Всего:** 4 errors, 1 warning

| Файл | Правило | Тип |
|------|---------|-----|
| `src/main.ts:49` | `@typescript-eslint/explicit-function-return-type` | Warning |
| `tests/unit/handlers/goal-deposit.spec.ts:189` | `@typescript-eslint/no-explicit-any` | Error |
| `tests/unit/handlers/transaction-created.spec.ts:1` | `@typescript-eslint/no-unused-vars` | Error |
| `tests/unit/handlers/transaction-created.spec.ts:165` | `@typescript-eslint/no-explicit-any` | Error |
| `tests/unit/telegram.service.spec.ts:1` | `@typescript-eslint/no-unused-vars` | Error |

---

## 3. Анализ типов

### Explicit `any` в src/
**api/src:** ✅ 0 найдено
**notifications/src:** ✅ 0 найдено

### @ts-ignore / @ts-expect-error
✅ Не найдено в проекте

### Type assertions (`as Type`)
**Всего:** 7

| Сервис | Файл | Строка | Код |
|--------|------|--------|-----|
| api | `src/shared/middleware/validation.ts` | 15 | `request as FastifyRequest & { validatedBody: T }` |
| api | `src/shared/middleware/validation.ts` | 30 | `request as FastifyRequest & { validatedParams: T }` |
| api | `src/shared/middleware/validation.ts` | 45 | `request as FastifyRequest & { validatedQuery: T }` |
| api | `src/modules/auth/api/auth.controller.ts` | 50 | `request as FastifyRequest & { user?: {...} }` |
| api | `src/modules/auth/application/jwt.service.ts` | 45 | `jwt.verify(...) as TokenPayload` |
| api | `src/modules/auth/application/jwt.service.ts` | 49 | `jwt.verify(...) as TokenPayload` |
| notifications | `src/shared/auth/jwt.service.ts` | 9 | `jwt.verify(...) as TokenPayload` |

**Оценка:** Большинство assertions связаны с JWT и расширением FastifyRequest. Можно типизировать через Fastify generics.

---

## 4. Тесты и покрытие

### api/
| Метрика | Значение | До 80% |
|---------|----------|--------|
| Functions | 66.06% | +13.94% |
| Lines | 69.22% | +10.78% |
| **Тесты** | 76 pass / 9 fail | — |

**Непокрытые области (критичные):**
- `src/modules/*/infrastructure/*.repository.prisma.ts` — 0-10% покрытия
- `src/modules/*/application/*.service.ts` — 7-16% покрытия (кроме goal.service: 75%)
- `src/shared/middleware/auth.ts` — 6.90%
- `src/shared/rabbitmq/` — 9-27%

### notifications/
| Метрика | Значение | До 80% |
|---------|----------|--------|
| Functions | 90.00% | ✅ |
| Lines | 84.71% | ✅ |
| **Тесты** | 12 pass / 10 fail | — |

**Примечание:** Тесты падают из-за отсутствия тестовой БД. Нужны моки для Prisma.

---

## 5. Приоритизированный список проблем

### Критичные (блокируют сборку)
1. ❌ `notifications/src/settings/infrastructure/prisma-settings.repository.ts` — TypeScript ошибки
2. ❌ ESLint errors в тестах (unused vars)

### Высокий приоритет (влияют на качество)
3. ⚠️ Coverage api/ repositories: 0-10%
4. ⚠️ Coverage api/ services: 7-16%
5. ⚠️ Type assertions в auth и validation (7 шт)

### Средний приоритет
6. ⚠️ ESLint warnings — missing return types (4 шт)
7. ⚠️ Tests notifications/ — нужны моки для Prisma

### Низкий приоритет
8. 📝 Coverage shared/rabbitmq, shared/middleware/auth

---

## 6. Рекомендации для Фазы 2

1. **TypeScript:** Включить строгие опции постепенно, начать с `noImplicitReturns`
2. **ESLint:** Исправить errors перед включением stricter rules
3. **Тесты:**
   - Создать моки для Prisma client
   - Начать с unit тестов на services
   - Integration тесты уже есть, но падают — нужен testcontainers setup

---

## Вывод

| Критерий | api/ | notifications/ |
|----------|------|----------------|
| TypeScript | ✅ | ❌ 4 ошибки |
| ESLint errors | 2 | 4 |
| ESLint warnings | 3 | 1 |
| Coverage | ~68% | ~85% |
| До 80% | -12% | ✅ |
