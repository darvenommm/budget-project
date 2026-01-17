import { prisma } from '../shared/database/index.js';
import { logger } from '../shared/logger/index.js';
import {
  BudgetEvent,
  TransactionCreatedEvent,
  GoalDepositEvent,
} from '../rabbitmq/events.js';
import {
  sendMessage,
  formatLimitExceededMessage,
  formatGoalReachedMessage,
} from '../telegram/telegram.service.js';

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
  await sendMessage({
    chatId: settings.telegramChatId,
    text: message,
  });

  logger.info('Limit exceeded notification sent', { userId, categoryName });
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
  await sendMessage({
    chatId: settings.telegramChatId,
    text: message,
  });

  logger.info('Goal reached notification sent', { userId, goalName });
}

export async function handleEvent(event: BudgetEvent): Promise<void> {
  switch (event.type) {
    case 'TRANSACTION_CREATED':
      await handleTransactionCreated(event);
      break;
    case 'GOAL_DEPOSIT':
      await handleGoalDeposit(event);
      break;
    default:
      logger.warn('Unknown event type', { event });
  }
}
