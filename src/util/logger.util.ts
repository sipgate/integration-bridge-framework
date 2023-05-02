import { anonymizeKey } from "./anonymize-key";
import { Config } from "../models";

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
        `[${source.toUpperCase()}]`,
        message,
        args
      )
    );
  } else {
    console.log(
      constructLogMessage(`[${source.toUpperCase()}]`, message, args)
    );
  }
};

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
        `[${source.toUpperCase()}]`,
        message,
        args
      )
    );
  } else {
    console.error(
      constructLogMessage(`[${source.toUpperCase()}]`, message, args)
    );
  }
};

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
        `[${source.toUpperCase()}]`,
        message,
        args
      )
    );
  } else {
    console.warn(
      constructLogMessage(`[${source.toUpperCase()}]`, message, args)
    );
  }
};

const constructLogMessage = (...args: unknown[]): string =>
  `${args
    .flat()
    .map((item: unknown) =>
      typeof item !== "string" ? JSON.stringify(item) : item
    )
    .join(" ")}`;
