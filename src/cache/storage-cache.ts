import { Contact, ContactCache } from "../models";
import {
  CacheItemState,
  CacheItemStateType,
} from "../models/cache-item-state.model";
import { StorageAdapter } from "../models/storage-adapter.model";
import { anonymizeKey } from "../util/anonymize-key";

const LOG_PREFIX = `[CACHE]`;
const CACHE_STATE_PREFIX = "cache-state:";
const CACHE_STATE_SECONDS_TTL = 1800; // 30 minutes

export class StorageCache implements ContactCache {
  private storage: StorageAdapter;
  private cacheRefreshIntervalMs = 30 * 60 * 1000; // 30 minutes

  constructor(storageAdapter: StorageAdapter) {
    this.storage = storageAdapter;

    const { CACHE_REFRESH_INTERVAL } = process.env;
    if (CACHE_REFRESH_INTERVAL) {
      this.cacheRefreshIntervalMs =
        Math.max(Number(CACHE_REFRESH_INTERVAL), 1) * 1000;
    }

    this.log(
      `Initialized storage cache with maximum refresh interval of ${
        this.cacheRefreshIntervalMs / 1000
      }s.`
    );
  }

  public async get(
    key: string,
    getFreshValue?: (key: string) => Promise<Contact[]>
  ): Promise<Contact[] | CacheItemState> {
    try {
      this.log(`[${anonymizeKey(key)}] Trying to get Contacts from cache…`);
      const start = performance.now();
      const cacheItemState = await this.storage.get<CacheItemState>(
        this.getCacheItemKey(key)
      );

      const value = await this.storage.get<Contact[]>(key);
      console.log(
        `[${anonymizeKey(key)}] loading contacts took ${
          performance.now() - start
        }ms`
      );

      if (
        cacheItemState &&
        cacheItemState.state === CacheItemStateType.FETCHING
      ) {
        this.log(
          `[${anonymizeKey(
            key
          )}] Not refreshing for because fetching is already in progress.`
        );

        // if we have old contacts saved in cache we return them instead
        if (value && value.length > 0) {
          this.log(
            `[${anonymizeKey(key)}] Returning previously cached contacts (${
              value.length
            }), because new contacts are still being fetched.`
          );
          return value;
        }

        return cacheItemState;
      }

      if (value) {
        this.log(
          `[${anonymizeKey(key)}] Found contacts ${
            value.length
          } for key in cache.`
        );

        const now: number = new Date().getTime();

        const isValueStale: boolean = Boolean(
          !cacheItemState ||
            (cacheItemState.state === CacheItemStateType.CACHED &&
              now > cacheItemState.updated + this.cacheRefreshIntervalMs)
        );

        if (getFreshValue && isValueStale) {
          this.log(
            `[${anonymizeKey(key)}] value was stale, fetching fresh contacts`
          );
          // we don't return the fresh value here because we don't want to wait on the result.
          // We return the old value instead, the fresh value is returned the next time it is requested
          this.getRefreshed(key, getFreshValue).catch((error) => {
            this.logErr(
              `[${anonymizeKey(
                key
              )}] Unable to get fresh values, error was ${error}`
            );
          });
        }

        return value;
      }
    } catch (e) {
      this.logErr(`[${anonymizeKey(key)}] Unable to get cache".`, e);
    }

    if (!getFreshValue) {
      this.log(
        `[${anonymizeKey(
          key
        )}] No getFreshValue function provided. Returning empty array.`
      );
      return [];
    }

    this.log(
      `[${anonymizeKey(key)}] Found no match in cache. Getting fresh value.`
    );
    return this.getRefreshed(key, getFreshValue);
  }

  public async set(key: string, value: Contact[]): Promise<void> {
    this.log(
      `[${anonymizeKey(key)}] Saving ${value.length} contacts to cache.`
    );
    try {
      await this.storage.set(key, value);
    } catch (e) {
      this.logErr(`[${anonymizeKey(key)}] Unable to set cache.`, e);
    }
  }

  public async delete(key: string): Promise<void> {
    this.log(`[${anonymizeKey(key)}] Removing contacts from cache.`);
    try {
      await this.storage.delete(key);
    } catch (e) {
      this.logErr(`[${anonymizeKey(key)}] Unable to delete cache`, e);
    }
  }

  private async getRefreshed(
    key: string,
    getFreshValue: (key: string) => Promise<Contact[]>
  ): Promise<Contact[]> {
    this.log(`[${anonymizeKey(key)}] Refreshing value…`);

    await this.storage.set<CacheItemState>(
      this.getCacheItemKey(key),
      {
        state: CacheItemStateType.FETCHING,
      },
      CACHE_STATE_SECONDS_TTL
    );

    try {
      const freshValue = await getFreshValue(key);

      if (freshValue) {
        await this.set(key, freshValue);
      }

      return freshValue;
    } catch (error) {
      this.log(`[${anonymizeKey(key)}] Error while refreshing value`, error);
      throw error;
    }
  }

  private getCacheItemKey(key: string) {
    return `${CACHE_STATE_PREFIX}${key}`;
  }

  private log(...args: any) {
    console.log(this.constructLogMessage(args));
  }

  private logErr(...args: any) {
    console.error(this.constructLogMessage(args));
  }

  private constructLogMessage(...args: any) {
    return `${LOG_PREFIX} ${args
      .flat()
      .map((item: unknown) =>
        typeof item !== "string" ? JSON.stringify(item) : item
      )
      .join(" ")}`;
  }
}
