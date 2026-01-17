# Fix Build Errors Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all TypeScript and build errors in API and Notifications services.

**Scope:** 4 categories of fixes across 5 files.

---

## Task 1: Replace bcrypt with Bun.password API

**Files:**
- Modify: `api/src/modules/auth/application/password.service.ts`
- Modify: `api/package.json`

**Step 1: Update password.service.ts**

```typescript
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
```

Remove the bcrypt import entirely.

**Step 2: Remove bcrypt from package.json**

Remove from dependencies:
- `bcrypt`

Remove from devDependencies:
- `@types/bcrypt`

**Step 3: Reinstall dependencies**

Run: `bun install`

**Step 4: Commit**

```bash
git add .
git commit -m "refactor(auth): replace bcrypt with Bun.password API"
```

---

## Task 2: Fix Fastify route typing (goals module)

**Files:**
- Modify: `api/src/modules/goals/api/goal.routes.ts`

**Step 1: Add generic types to routes**

```typescript
app.get<{ Params: { id: string } }>(
  '/api/goals/:id',
  { preHandler: authMiddleware },
  controller.getById.bind(controller)
);

app.put<{ Params: { id: string } }>(
  '/api/goals/:id',
  { preHandler: authMiddleware },
  controller.update.bind(controller)
);

app.delete<{ Params: { id: string } }>(
  '/api/goals/:id',
  { preHandler: authMiddleware },
  controller.delete.bind(controller)
);

app.post<{ Params: { id: string } }>(
  '/api/goals/:id/deposit',
  { preHandler: authMiddleware },
  controller.deposit.bind(controller)
);
```

**Step 2: Commit**

```bash
git add .
git commit -m "fix(goals): add Fastify generic types to routes"
```

---

## Task 3: Fix import type errors (decorators)

**Files:**
- Modify: `api/src/modules/goals/infrastructure/goal.repository.prisma.ts`
- Modify: `api/src/modules/notifications/infrastructure/notification-settings.repository.prisma.ts`

**Step 1: Update goal.repository.prisma.ts**

Change:
```typescript
import { Goal, CreateGoalData, UpdateGoalData } from '../domain/goal.entity.js';
```

To:
```typescript
import type { Goal, CreateGoalData, UpdateGoalData } from '../domain/goal.entity.js';
```

**Step 2: Update notification-settings.repository.prisma.ts**

Change:
```typescript
import { NotificationSettings, UpdateNotificationSettingsData } from '../domain/notification-settings.entity.js';
```

To:
```typescript
import type { NotificationSettings, UpdateNotificationSettingsData } from '../domain/notification-settings.entity.js';
```

**Step 3: Commit**

```bash
git add .
git commit -m "fix: use import type for decorated signatures"
```

---

## Task 4: Fix amqplib typing (notifications)

**Files:**
- Modify: `notifications/src/rabbitmq/consumer.ts`

**Step 1: Fix imports and types**

Change:
```typescript
import amqplib, { Channel, Connection } from 'amqplib';
let connection: Connection | null = null;
```

To:
```typescript
import amqplib from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';

let connection: ChannelModel | null = null;
```

**Step 2: Add null safety with optional chaining**

In `disconnectRabbitMQ`:
```typescript
export async function disconnectRabbitMQ(): Promise<void> {
  await channel?.close();
  await connection?.close();
  logger.info('RabbitMQ disconnected');
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "fix(notifications): fix amqplib types and null safety"
```

---

## Task 5: Verification

**Step 1: TypeScript check API**

Run: `cd api && npx tsc --noEmit`
Expected: 0 errors

**Step 2: TypeScript check Notifications**

Run: `cd notifications && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Build API**

Run: `cd api && bun run build`
Expected: Successful build

**Step 4: Build Notifications**

Run: `cd notifications && bun run build`
Expected: Successful build

**Step 5: Run tests**

Run: `cd api && bun test`
Expected: All tests pass

**Step 6: Final commit**

```bash
git add .
git commit -m "chore: verify all builds pass"
```

---

## Summary

| Task | Files | Changes |
|------|-------|---------|
| 1. Bun.password | 2 | Replace bcrypt |
| 2. Fastify generics | 1 | Add route types |
| 3. Import type | 2 | Fix decorator imports |
| 4. amqplib types | 1 | Fix Connection type |
| 5. Verification | 0 | Run checks |

**Total:** 6 files, ~20 lines changed
