import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Mock fetch globally
interface MockResponse {
  ok: boolean;
  status?: number;
  json: () => Promise<{ ok: boolean; description?: string }>;
}

const mockFetch = mock(
  (): Promise<MockResponse> =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }),
);
globalThis.fetch = mockFetch as unknown as typeof fetch;

// Mock NotificationSettings type
interface MockNotificationSettings {
  id: string;
  userId: string;
  telegramChatId: string | null;
  notifyLimitExceeded: boolean;
  notifyGoalReached: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock Prisma
const mockPrismaNotificationSettings = {
  findUnique: mock((): Promise<MockNotificationSettings | null> => Promise.resolve(null)),
};

const mockPrisma = {
  notificationSettings: mockPrismaNotificationSettings,
  $queryRaw: mock(() => Promise.resolve([{ result: 1 }])),
};

// Mock the database module
void mock.module('../../../src/shared/database/index.js', () => ({
  prisma: mockPrisma,
  connectDatabase: mock(() => Promise.resolve()),
  disconnectDatabase: mock(() => Promise.resolve()),
}));

// Set env before import
process.env['TELEGRAM_BOT_TOKEN'] = 'test-bot-token';

import type { TransactionCreatedEventV1 } from '../../../src/rabbitmq/events.ts';

describe('handleTransactionCreated', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockPrismaNotificationSettings.findUnique.mockClear();
  });

  const createTransactionEvent = (
    overrides: Partial<TransactionCreatedEventV1['payload']> = {},
  ): TransactionCreatedEventV1 => ({
    type: 'TRANSACTION_CREATED',
    version: 1,
    timestamp: new Date().toISOString(),
    payload: {
      userId: 'user-123',
      categoryId: 'cat-123',
      categoryName: 'Food',
      amount: 150,
      budgetId: 'budget-123',
      currentSpent: 150,
      limitAmount: 100,
      ...overrides,
    },
  });

  it('should send notification when limit is exceeded and notifications are enabled', async () => {
    mockPrismaNotificationSettings.findUnique.mockResolvedValue({
      id: 'settings-123',
      userId: 'user-123',
      telegramChatId: '12345',
      notifyLimitExceeded: true,
      notifyGoalReached: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockFetch.mockImplementation(
      (): Promise<MockResponse> =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        }),
    );

    const { handleEvent } = await import('../../../src/handlers/index.js');

    const event = createTransactionEvent();
    await handleEvent(event);

    expect(mockPrismaNotificationSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should not send notification when limit is not exceeded', async () => {
    const { handleEvent } = await import('../../../src/handlers/index.js');

    const event = createTransactionEvent({
      currentSpent: 50,
      limitAmount: 100,
    });
    await handleEvent(event);

    expect(mockPrismaNotificationSettings.findUnique).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not send notification when user has no telegram linked', async () => {
    mockPrismaNotificationSettings.findUnique.mockResolvedValue({
      id: 'settings-123',
      userId: 'user-123',
      telegramChatId: null,
      notifyLimitExceeded: true,
      notifyGoalReached: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { handleEvent } = await import('../../../src/handlers/index.js');

    const event = createTransactionEvent();
    await handleEvent(event);

    expect(mockPrismaNotificationSettings.findUnique).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not send notification when notifications are disabled', async () => {
    mockPrismaNotificationSettings.findUnique.mockResolvedValue({
      id: 'settings-123',
      userId: 'user-123',
      telegramChatId: '12345',
      notifyLimitExceeded: false,
      notifyGoalReached: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { handleEvent } = await import('../../../src/handlers/index.js');

    const event = createTransactionEvent();
    await handleEvent(event);

    expect(mockPrismaNotificationSettings.findUnique).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not send notification when no settings exist', async () => {
    mockPrismaNotificationSettings.findUnique.mockResolvedValue(null);

    const { handleEvent } = await import('../../../src/handlers/index.js');

    const event = createTransactionEvent();
    await handleEvent(event);

    expect(mockPrismaNotificationSettings.findUnique).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle unknown event type gracefully', async () => {
    const { handleEvent } = await import('../../../src/handlers/index.js');

    // Test with an unknown event type - should log warning and not throw
    const unknownEvent = {
      type: 'UNKNOWN_EVENT' as const,
      version: 1,
      timestamp: new Date().toISOString(),
      payload: {},
    };

    await handleEvent(unknownEvent as unknown as TransactionCreatedEventV1);
    expect(mockPrismaNotificationSettings.findUnique).not.toHaveBeenCalled();
  });
});
