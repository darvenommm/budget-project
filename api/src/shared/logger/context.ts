import { AsyncLocalStorage } from 'async_hooks';

interface LogContext {
  correlationId: string;
}

export const logContext = new AsyncLocalStorage<LogContext>();

export function getCorrelationId(): string {
  return logContext.getStore()?.correlationId ?? 'no-correlation-id';
}

export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return logContext.run({ correlationId }, fn);
}
