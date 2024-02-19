import { delay } from './delay';

export type WannaRetryFn = (e: Error) => boolean;
export type ProcessFn<T> = () => T;

export async function retry<T>(
  wannaRetry: WannaRetryFn,
  maxRetries: number,
  process: ProcessFn<T>,
  delayMs?: number,
): Promise<T> {
  let retries = 0;

  do {
    try {
      return await process();
    } catch (e: unknown) {
      if (++retries <= maxRetries && wannaRetry(e as Error)) {
        delayMs && (await delay(delayMs));
        continue;
      } else {
        throw e;
      }
    }
    // eslint-disable-next-line  no-constant-condition
  } while (true);
}
