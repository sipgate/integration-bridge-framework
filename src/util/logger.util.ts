import { anonymizeKey } from "./anonymize-key";
import { Config } from "../models";

export const infoLogger = (
  message: string,
  config?: Config,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  if (config) {
    console.log(
      `${`[${anonymizeKey(config.apiKey)}]`}: ${message}`,
      args && args.length ? args : ""
    );
  } else {
    console.log(message, args && args.length ? args : "");
  }
};

export const errorLogger = (
  message: string,
  config?: Config,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  if (config?.apiKey) {
    console.error(
      `[${anonymizeKey(config.apiKey)}] ${message}`,
      args && args.length ? args : ""
    );
  } else {
    console.error(message, args && args.length ? args : "");
  }
};

export const warnLogger = (
  message: string,
  config?: Config,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  if (config?.apiKey) {
    console.warn(
      `[${anonymizeKey(config.apiKey)}] ${message}`,
      args && args.length ? args : ""
    );
  } else {
    console.warn(message, args && args.length ? args : "");
  }
};
