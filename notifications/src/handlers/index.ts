import { prisma } from '../shared/database/index.ts';
import { logger } from '../shared/logger/index.ts';
import type { BudgetEvent, TransactionCreatedEvent, GoalDepositEvent } from '../rabbitmq/events.ts';
import {
  sendMessageWithRetry,
  formatLimitExceededMessage,
  formatGoalReachedMessage,
} from '../telegram/telegram.service.ts';

async function handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
  const { userId, categoryName, currentSpent, limitAmount } = event.payload;

  if (currentSpent < limitAmount) {
    logger.debug('Limit not exceeded, skipping notification', { userId, categoryName });
    return;
  }

  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (!settings?.telegramChatId || !settings.notifyLimitExceeded) {
    logger.debug('User has no telegram linked or notifications disabled', { userId });
    return;
  }

  const message = formatLimitExceededMessage(categoryName, currentSpent, limitAmount);
  const sent = await sendMessageWithRetry({
    chatId: settings.telegramChatId,
    text: message,
  });

  if (sent) {
    logger.info('Limit exceeded notification sent', { userId, categoryName });
  } else {
    logger.error('Failed to send limit exceeded notification', { userId, categoryName });
  }
}

async function handleGoalDeposit(event: GoalDepositEvent): Promise<void> {
  const { userId, goalName, currentAmount, targetAmount } = event.payload;

  if (currentAmount < targetAmount) {
    logger.debug('Goal not reached, skipping notification', { userId, goalName });
    return;
  }

  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (!settings?.telegramChatId || !settings.notifyGoalReached) {
    logger.debug('User has no telegram linked or notifications disabled', { userId });
    return;
  }

  const message = formatGoalReachedMessage(goalName, currentAmount, targetAmount);
  const sent = await sendMessageWithRetry({
    chatId: settings.telegramChatId,
    text: message,
  });

  if (sent) {
    logger.info('Goal reached notification sent', { userId, goalName });
  } else {
    logger.error('Failed to send goal reached notification', { userId, goalName });
  }
}

export async function handleEvent(event: BudgetEvent): Promise<void> {
  switch (event.type) {
    case 'TRANSACTION_CREATED':
      // Currently only V1 exists, add version check when V2 is introduced
      await handleTransactionCreated(event);
      break;
    case 'GOAL_DEPOSIT':
      // Currently only V1 exists, add version check when V2 is introduced
      await handleGoalDeposit(event);
      break;
    default:
      logger.warn('Unknown event type', { event });
  }
}
