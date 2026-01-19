import type { Logger } from 'pino';
import { pino, stdTimeFunctions } from 'pino';
import { getCorrelationId } from './context.ts';

const baseLogger: Logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: stdTimeFunctions.isoTime,
});

export const logger = {
  info: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.info({ correlationId: getCorrelationId(), ...data }, msg);
  },
  warn: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.warn({ correlationId: getCorrelationId(), ...data }, msg);
  },
  error: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.error({ correlationId: getCorrelationId(), ...data }, msg);
  },
  debug: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.debug({ correlationId: getCorrelationId(), ...data }, msg);
  },
};

export { getCorrelationId, runWithCorrelationId } from './context.ts';
