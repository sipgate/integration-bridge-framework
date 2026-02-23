import { context, propagation, trace } from '@opentelemetry/api';

import { anonymizeKey } from './anonymize-key';
import { userIdStorage } from '../middlewares';

function addMessageToTraceSpan(
  method: 'log' | 'error' | 'warn',
  message: string,
  args?: unknown[],
) {
  const span = trace.getSpan(context.active());
  if (span) {
    span.addEvent(method, {
      message,
      args: args ? args.map((arg) => JSON.stringify(arg)).join(',') : '',
    });
  }
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
  const formatedMessage = constructLogMessage(`[${source}]`, message);

  if (process.env.NODE_ENV === 'development') {
    logFn(formatedMessage, ...args);
    return;
  }
  const data: Record<string, unknown> = { ...args };

  const anonymizedApiKey = apiKey ? anonymizeKey(apiKey) : undefined;

  if (anonymizedApiKey) {
    data.apiKey = anonymizedApiKey;
  }

  const object: Record<string, unknown> = {};
  propagation.inject(context.active(), object);

  // format tracing info for gcloud logging
  let traceProp = {};
  if (object.traceparent && typeof object.traceparent === 'string') {
    const [, traceId, spanId] = object.traceparent.split('-');

    traceProp =
      process.env.NODE_ENV === 'production'
        ? {
            'logging.googleapis.com/trace': `projects/clinq-services/traces/${traceId}`,
            'logging.googleapis.com/spanId': spanId,
            'logging.googleapis.com/sampled': false,
          }
        : {};
  }

  logFn(
    JSON.stringify({
      ...traceProp,
      message: formatedMessage,
      userId: userIdStorage.getStore(),
      ...data,
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
