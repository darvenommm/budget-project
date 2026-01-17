import { telegramConfig } from '../config/index.js';
import { logger } from '../shared/logger/index.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export interface SendMessageOptions {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
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
      const errorData = await response.json();
      logger.error('Telegram API error', { status: response.status, error: errorData });
      return false;
    }

    logger.info('Telegram message sent', { chatId });
    return true;
  } catch (error) {
    logger.error('Failed to send Telegram message', { error, chatId });
    return false;
  }
}

export function formatLimitExceededMessage(
  categoryName: string,
  currentSpent: number,
  limitAmount: number
): string {
  const percentage = Math.round((currentSpent / limitAmount) * 100);
  return (
    `<b>Budget Limit Exceeded!</b>\n\n` +
    `Category: <b>${categoryName}</b>\n` +
    `Spent: ${currentSpent.toFixed(2)}\n` +
    `Limit: ${limitAmount.toFixed(2)}\n` +
    `Usage: ${percentage}%`
  );
}

export function formatGoalReachedMessage(
  goalName: string,
  currentAmount: number,
  targetAmount: number
): string {
  return (
    `<b>Goal Reached!</b>\n\n` +
    `Goal: <b>${goalName}</b>\n` +
    `Current: ${currentAmount.toFixed(2)}\n` +
    `Target: ${targetAmount.toFixed(2)}\n\n` +
    `Congratulations! You've reached your savings goal!`
  );
}
