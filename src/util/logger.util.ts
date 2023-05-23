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
  apiKey?: string,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  if (apiKey) {
    console.log(
      constructLogMessage(
        `[${anonymizeKey(apiKey)}]`,
        `[${source}]`,
        message,
        args
      )
    );
  } else {
    console.log(constructLogMessage(`[${source}]`, message, args));
  }
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
  // eslint-disable-next-line no-console
  if (apiKey) {
    console.error(
      constructLogMessage(
        `[${anonymizeKey(apiKey)}]`,
        `[${source}]`,
        message,
        args
      )
    );
  } else {
    console.error(constructLogMessage(`[${source}]`, message, args));
  }
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
  // eslint-disable-next-line no-console
  if (apiKey) {
    console.warn(
      constructLogMessage(
        `[${anonymizeKey(apiKey)}]`,
        `[${source}]`,
        message,
        args
      )
    );
  } else {
    console.warn(constructLogMessage(`[${source}]`, message, args));
  }
};

const constructLogMessage = (...args: unknown[]): string =>
  `${args
    .flat()
    .map((item: unknown) =>
      typeof item !== "string" ? JSON.stringify(item) : item
    )
    .join(" ")}`;
