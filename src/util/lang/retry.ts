import { delay } from './delay';
import { infoLogger } from '../logger.util';

export interface RetryDecision {
  wantRetry: boolean;
  delayMs?: number;
}

export type RetryDecider = (e: unknown) => RetryDecision;
export type BusinessLogic<T> = () => T;

export async function retry<T>(
  businessLogic: BusinessLogic<T>,
  retryDecider: RetryDecider,
  maxRetries: number,
): Promise<T> {
  let retries = 0;

  do {
    try {
      return await businessLogic();
    } catch (e: unknown) {
      if (++retries <= maxRetries) {
        const { wantRetry, delayMs } = retryDecider(e);

        if (wantRetry) {
          infoLogger(
            'retry',
            `retry desired with delay of ${delayMs || 0}ms`,
            undefined,
            { error: e },
          );

          delayMs && (await delay(delayMs));

          continue;
        }
      }

      throw e;
    }
    // eslint-disable-next-line  no-constant-condition
  } while (true);
}
