import { anonymizeKey } from "./anonymize-key";
import { Config } from "../models";

export const infoLogger = (
  { apiKey }: Config,
  message: string,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  console.log(
    `${anonymizeKey(apiKey)}: ${message}`,
    args && args.length ? args : ""
  );
};

export const errorLogger = (
  config: Config | undefined,
  message: string,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  console.error(
    `${config?.apiKey ? `[${anonymizeKey(config.apiKey)}]` : ""}: ${message}`,
    args && args.length ? args : ""
  );
};

export const warnLogger = (
  config: Config | undefined,
  message: string,
  ...args: unknown[]
): void => {
  // eslint-disable-next-line no-console
  console.warn(
    `${config?.apiKey ? `[${anonymizeKey(config.apiKey)}]` : ""}: ${message}`,
    args && args.length ? args : ""
  );
};
