import { context, trace } from '@opentelemetry/api';

import { anonymizeKey } from './anonymize-key';
import { playtypusUserIdStorage } from '../middlewares';

function addMessageToTraceSpan(
  method: 'log' | 'error' | 'warn',
  message: string,
  args: unknown[] = [],
) {
  const span = trace.getSpan(context.active());
  if (!span) {
    return;
  }

  const data = args;
  const userId = playtypusUserIdStorage.getStore();

  if (userId) {
    data.push({ platypusUserId: userId });
  }

  span.addEvent(method, {
    message,
    args:
      data?.length !== 0
        ? data.map((arg) => JSON.stringify(arg)).join(',')
        : '',
  });
}

/**
 * Logging function equivalent to console.log
 * @param source the context where the log originated from (usually the function name)
 * @param message the message of the log
 * @param apiKey the refreshToken
 * @param args additional data, will be stringified and appended
 */
export const infoLogger = (
  source: string,
  message: string,
  apiKey?: string,
  ...args: unknown[]
): void => {
  addMessageToTraceSpan('log', message, [...args]);

  logger(console.info, source, message, apiKey, ...args);
};

/**
 * Logging function equivalent to console.error
 * @param source the context where the log originated from (usually the function name)
 * @param message the message of the log
 * @param apiKey the refreshToken
 * @param args additional data, will be stringified and appended
 */
export const errorLogger = (
  source: string,
  message: string,
  apiKey?: string,
  ...args: unknown[]
): void => {
  addMessageToTraceSpan('error', message, [...args]);

  logger(console.error, source, message, apiKey, ...args);
};

/**
 * Logging function equivalent to console.warn
 * @param source the context where the log originated from (usually the function name)
 * @param message the message of the log
 * @param apiKey the refreshToken
 * @param args additional data, will be stringified and appended
 */
export const warnLogger = (
  source: string,
  message: string,
  apiKey?: string,
  ...args: unknown[]
): void => {
  addMessageToTraceSpan('warn', message, [...args]);

  logger(console.warn, source, message, apiKey, ...args);
};
const logger = (
  logFn: (message?: any, ...optionalParams: any[]) => void,
  source: string,
  message: string,
  apiKey: string | undefined,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  const anonymizedApiKey = apiKey ? anonymizeKey(apiKey) : undefined;

  const formatedMessage = constructLogMessage(
    anonymizedApiKey ? `[${anonymizedApiKey}]` : undefined,
    `[${source}]`,
    message,
  );

  if (process.env.NODE_ENV === 'development') {
    logFn(formatedMessage, ...args);
    return;
  }

  const data: Record<string, unknown> = { ...args };
  const userId = playtypusUserIdStorage.getStore();

  if (userId) {
    data.platypusUserId = userId;
  }

  logFn(
    JSON.stringify({
      message: formatedMessage,
      data,
    }),
  );
};

const constructLogMessage = (...args: unknown[]): string =>
  `${args
    .flat()
    .filter((item) => item !== undefined)
    .map((item: unknown) => {
      if (Array.isArray(item) && item.length === 0) return;
      return typeof item !== 'string' ? JSON.stringify(item) : item;
    })
    .join(' ')}`;
