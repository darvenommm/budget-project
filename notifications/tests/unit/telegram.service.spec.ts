import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Mock fetch globally before importing the module
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

// Set env before import
process.env['TELEGRAM_BOT_TOKEN'] = 'test-bot-token';

describe('Telegram Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('sendMessage', () => {
    it('should return true on successful message send', async () => {
      mockFetch.mockImplementation(
        (): Promise<MockResponse> =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ok: true }),
          }),
      );

      // Import fresh module after mocking
      const { sendMessage } = await import('../../src/telegram/telegram.service.js');

      const result = await sendMessage({
        chatId: '12345',
        text: 'Test message',
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return false on API error', async () => {
      mockFetch.mockImplementation(
        (): Promise<MockResponse> =>
          Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ ok: false, description: 'Bad Request' }),
          }),
      );

      const { sendMessage } = await import('../../src/telegram/telegram.service.js');

      const result = await sendMessage({
        chatId: '12345',
        text: 'Test message',
      });

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      const { sendMessage } = await import('../../src/telegram/telegram.service.js');

      const result = await sendMessage({
        chatId: '12345',
        text: 'Test message',
      });

      expect(result).toBe(false);
    });
  });

  describe('formatLimitExceededMessage', () => {
    it('should format limit exceeded message correctly', async () => {
      const { formatLimitExceededMessage } = await import('../../src/telegram/telegram.service.js');

      const message = formatLimitExceededMessage('Food', 150, 100);

      expect(message).toContain('Budget Limit Exceeded');
      expect(message).toContain('Food');
      expect(message).toContain('150.00');
      expect(message).toContain('100.00');
      expect(message).toContain('150%');
    });

    it('should escape HTML in category name', async () => {
      const { formatLimitExceededMessage } = await import('../../src/telegram/telegram.service.js');

      const message = formatLimitExceededMessage('<script>alert("xss")</script>', 100, 100);

      expect(message).not.toContain('<script>');
      expect(message).toContain('&lt;script&gt;');
    });
  });

  describe('formatGoalReachedMessage', () => {
    it('should format goal reached message correctly', async () => {
      const { formatGoalReachedMessage } = await import('../../src/telegram/telegram.service.js');

      const message = formatGoalReachedMessage('Vacation', 5000, 5000);

      expect(message).toContain('Goal Reached');
      expect(message).toContain('Vacation');
      expect(message).toContain('5000.00');
    });

    it('should escape HTML in goal name', async () => {
      const { formatGoalReachedMessage } = await import('../../src/telegram/telegram.service.js');

      const message = formatGoalReachedMessage('<img src=x onerror=alert(1)>', 1000, 1000);

      expect(message).not.toContain('<img');
      expect(message).toContain('&lt;img');
    });
  });

  describe('sendMessageWithRetry', () => {
    it('should return true on first successful attempt', async () => {
      mockFetch.mockImplementation(
        (): Promise<MockResponse> =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ok: true }),
          }),
      );

      const { sendMessageWithRetry } = await import('../../src/telegram/telegram.service.js');

      const result = await sendMessageWithRetry(
        {
          chatId: '12345',
          text: 'Test message',
        },
        3,
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      let callCount = 0;
      mockFetch.mockImplementation((): Promise<MockResponse> => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ ok: false }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      });

      const { sendMessageWithRetry } = await import('../../src/telegram/telegram.service.js');

      // Use 2 retries to keep delay at 2s (within 5s timeout)
      const result = await sendMessageWithRetry(
        {
          chatId: '12345',
          text: 'Test message',
        },
        2,
      );

      expect(result).toBe(true);
      expect(callCount).toBe(2);
    });
  });
});
