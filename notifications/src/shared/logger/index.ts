import type { Logger } from 'pino';
import { pino, stdTimeFunctions } from 'pino';

const baseLogger: Logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: stdTimeFunctions.isoTime,
});

export const logger = {
  info: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.info(data ?? {}, msg);
  },
  warn: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.warn(data ?? {}, msg);
  },
  error: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.error(data ?? {}, msg);
  },
  debug: (msg: string, data?: Record<string, unknown>): void => {
    baseLogger.debug(data ?? {}, msg);
  },
};
