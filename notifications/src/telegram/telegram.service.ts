import { telegramConfig } from '../config/index.ts';
import { logger } from '../shared/logger/index.ts';
import { TELEGRAM_RETRY_BASE_MS } from '../shared/constants/index.ts';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export interface SendMessageOptions {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendMessage(options: SendMessageOptions): Promise<boolean> {
  const { chatId, text, parseMode = 'HTML' } = options;

  const url = `${TELEGRAM_API_BASE}${telegramConfig.botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      logger.error('Telegram API error', { status: response.status, error: errorBody });
      return false;
    }

    logger.info('Telegram message sent', { chatId });
    return true;
  } catch (error) {
    logger.error('Telegram request failed', { error, chatId });
    return false;
  }
}

export async function sendMessageWithRetry(
  options: SendMessageOptions,
  maxRetries = 3,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const success = await sendMessage(options);
    if (success) return true;

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * TELEGRAM_RETRY_BASE_MS;
      logger.warn(`Telegram send failed, retrying in ${String(delay)}ms`, {
        attempt,
        chatId: options.chatId,
      });
      await sleep(delay);
    }
  }

  logger.error('Telegram send failed after all retries', { chatId: options.chatId, maxRetries });
  return false;
}

export function formatLimitExceededMessage(
  categoryName: string,
  currentSpent: number,
  limitAmount: number,
): string {
  const percentage = Math.round((currentSpent / limitAmount) * 100);
  return (
    `<b>Budget Limit Exceeded!</b>\n\n` +
    `Category: <b>${escapeHtml(categoryName)}</b>\n` +
    `Spent: ${currentSpent.toFixed(2)}\n` +
    `Limit: ${limitAmount.toFixed(2)}\n` +
    `Usage: ${String(percentage)}%`
  );
}

export function formatGoalReachedMessage(
  goalName: string,
  currentAmount: number,
  targetAmount: number,
): string {
  return (
    `<b>Goal Reached!</b>\n\n` +
    `Goal: <b>${escapeHtml(goalName)}</b>\n` +
    `Current: ${currentAmount.toFixed(2)}\n` +
    `Target: ${targetAmount.toFixed(2)}\n\n` +
    `Congratulations! You've reached your savings goal!`
  );
}
