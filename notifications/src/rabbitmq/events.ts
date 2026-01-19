export const EXCHANGE_NAME = 'budget.events';
export const QUEUE_NAME = 'notifications.queue';

export interface BaseEvent {
  version: number;
  timestamp: string;
  correlationId?: string;
}

export interface TransactionCreatedEventV1 extends BaseEvent {
  type: 'TRANSACTION_CREATED';
  version: 1;
  payload: {
    userId: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    budgetId: string;
    currentSpent: number;
    limitAmount: number;
  };
}

export interface GoalDepositEventV1 extends BaseEvent {
  type: 'GOAL_DEPOSIT';
  version: 1;
  payload: {
    userId: string;
    goalId: string;
    goalName: string;
    currentAmount: number;
    targetAmount: number;
  };
}

export type TransactionCreatedEvent = TransactionCreatedEventV1;
export type GoalDepositEvent = GoalDepositEventV1;

export type BudgetEvent = TransactionCreatedEvent | GoalDepositEvent;
