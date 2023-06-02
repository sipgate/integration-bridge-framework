import { anonymizeKey } from "./anonymize-key";

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
  apiKey: string | undefined,
  ...args: unknown[]
): void => {
  logger(console.info, source, message, apiKey, args);
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
  apiKey: string | undefined,
  ...args: unknown[]
): void => {
  logger(console.error, source, message, apiKey, args);
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
  logger(console.warn, source, message, apiKey, args);
};

const logger = (
  logFn: (message?: any, ...optionalParams: any[]) => void,
  source: string,
  message: string,
  apiKey: string | undefined,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  if (apiKey) {
    logFn(
      constructLogMessage(
        `[${anonymizeKey(apiKey)}]`,
        `[${source}]`,
        message,
        ...args
      )
    );
  } else {
    logFn(constructLogMessage(`[${source}]`, message, ...args));
  }
};

const constructLogMessage = (...args: unknown[]): string =>
  `${args
    .flat()
    .map((item: unknown) => {
      if (Array.isArray(item) && item.length == 0) return;
      return typeof item !== "string" ? JSON.stringify(item) : item;
    })
    .join(" ")}`;
