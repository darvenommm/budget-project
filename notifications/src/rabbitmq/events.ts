export const EXCHANGE_NAME = 'budget.events';
export const QUEUE_NAME = 'notifications.queue';

export interface TransactionCreatedEvent {
  type: 'TRANSACTION_CREATED';
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

export interface GoalDepositEvent {
  type: 'GOAL_DEPOSIT';
  payload: {
    userId: string;
    goalId: string;
    goalName: string;
    currentAmount: number;
    targetAmount: number;
  };
}

export type BudgetEvent = TransactionCreatedEvent | GoalDepositEvent;
