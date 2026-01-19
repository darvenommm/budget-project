export const EXCHANGE_NAME = 'budget.events';

export interface BaseEvent {
  version: number;
  timestamp: string;
  correlationId?: string | undefined;
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

export function createTransactionCreatedEvent(
  payload: TransactionCreatedEventV1['payload'],
  correlationId?: string,
): TransactionCreatedEventV1 {
  return {
    type: 'TRANSACTION_CREATED',
    version: 1,
    timestamp: new Date().toISOString(),
    correlationId,
    payload,
  };
}

export function createGoalDepositEvent(
  payload: GoalDepositEventV1['payload'],
  correlationId?: string,
): GoalDepositEventV1 {
  return {
    type: 'GOAL_DEPOSIT',
    version: 1,
    timestamp: new Date().toISOString(),
    correlationId,
    payload,
  };
}
