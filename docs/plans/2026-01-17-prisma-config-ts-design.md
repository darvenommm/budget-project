# План: Добавление prisma.config.ts и удаление env("DATABASE_URL")

## Цель

Перейти на программную конфигурацию Prisma через `prisma.config.ts`, убрав хардкод `env("DATABASE_URL")` из schema.prisma. URL базы данных будет собираться из отдельных переменных окружения.

## Контекст

- Монорепо с двумя воркспейсами: `api` и `notifications`
- Обе схемы идентичны и используют `env("DATABASE_URL")`
- Текущие версии Prisma: api — 5.8.1, notifications — 6.2.1
- Требуется обновление до Prisma 7.x для стабильной поддержки prisma.config.ts

## Решение

### Структура файлов

```
final-many-project/
├── shared/
│   └── database.ts          # Общая функция buildDatabaseUrl()
├── api/
│   └── prisma/
│       ├── schema.prisma    # Без url = env()
│       └── prisma.config.ts # Импортирует shared/database.ts
├── notifications/
│   └── prisma/
│       ├── schema.prisma    # Без url = env()
│       └── prisma.config.ts # Импортирует shared/database.ts
└── .env                     # DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
```

### shared/database.ts

```typescript
export function buildDatabaseUrl(): string {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'budget';
  const password = process.env.DB_PASSWORD ?? 'budget';
  const name = process.env.DB_NAME ?? 'budget_app';

  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
```

### api/prisma/prisma.config.ts и notifications/prisma/prisma.config.ts

```typescript
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Загружаем .env из корня проекта
const envPath = path.resolve(import.meta.dirname, '../../.env');
await import('dotenv').then(d => d.config({ path: envPath }));

import { buildDatabaseUrl } from '../../shared/database.js';

export default defineConfig({
  earlyAccess: true,
  schema: './schema.prisma',
  migrate: {
    development: {
      url: buildDatabaseUrl(),
    },
  },
});
```

### Изменения в schema.prisma (оба файла)

До:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

После:
```prisma
datasource db {
  provider = "postgresql"
}
```

### Обновление зависимостей

**api/package.json:**
- `prisma`: `^5.8.1` → `^7.2.0`
- `@prisma/client`: `^5.8.1` → `^7.2.0`

**notifications/package.json:**
- `prisma`: `^6.2.1` → `^7.2.0`
- `@prisma/client`: `^6.2.1` → `^7.2.0`

**Корневой package.json:**
- Добавить `dotenv`: `^16.4.0` в devDependencies

### Изменения в .env

До:
```env
DB_USER=budget
DB_PASSWORD=budget
DB_NAME=budget_app
```

После:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=budget
DB_PASSWORD=budget
DB_NAME=budget_app
```

## Шаги реализации

1. [ ] Обновить Prisma до 7.x в api/package.json
2. [ ] Обновить Prisma до 7.x в notifications/package.json
3. [ ] Добавить dotenv в корневой package.json
4. [ ] Создать shared/database.ts с функцией buildDatabaseUrl()
5. [ ] Создать api/prisma/prisma.config.ts
6. [ ] Создать notifications/prisma/prisma.config.ts
7. [ ] Убрать url = env("DATABASE_URL") из api/prisma/schema.prisma
8. [ ] Убрать url = env("DATABASE_URL") из notifications/prisma/schema.prisma
9. [ ] Добавить DB_HOST и DB_PORT в .env
10. [ ] Обновить .env.example соответственно
11. [ ] Запустить npm install для установки обновлённых пакетов
12. [ ] Запустить bunx prisma generate в каждом воркспейсе для проверки

## Преимущества

- Программная конфигурация подключения к БД через TypeScript
- Отдельные переменные окружения вместо монолитного DATABASE_URL
- Общая логика в shared/database.ts для реюза
- Современный подход с Prisma 7.x
