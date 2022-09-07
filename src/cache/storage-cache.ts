import { Contact, ContactCache } from "../models";
import {
  CacheItemState,
  CacheItemStateType,
} from "../models/cache-item-state.model";
import { StorageAdapter } from "../models/storage-adapter.model";
import { anonymizeKey } from "../util/anonymize-key";

const CACHE_STATE_PREFIX = "cache-state:";

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

    console.log(
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
      const cacheItemState = await this.storage.get<CacheItemState>(
        this.getCacheItemKey(key)
      );

      if (
        cacheItemState &&
        cacheItemState.state === CacheItemStateType.FETCHING
      ) {
        console.log(
          `Not refreshing for key "${anonymizeKey(
            key
          )}" because fetching is already in progress.`
        );
        return cacheItemState;
      }

      const value = await this.storage.get<Contact[]>(key);

      if (value) {
        console.log(`Found match for key "${anonymizeKey(key)}" in cache.`);

        const now: number = new Date().getTime();

        const isValueStale: boolean = Boolean(
          cacheItemState &&
            cacheItemState.state === CacheItemStateType.CACHED &&
            now > cacheItemState.updated + this.cacheRefreshIntervalMs
        );

        if (getFreshValue && isValueStale) {
          this.getRefreshed(key, getFreshValue).catch((error) => {
            console.error(
              `Unable to get fresh values for"${anonymizeKey(
                key
              )}" with error ${error}`
            );
          });
        }

        return value;
      }
    } catch (e) {
      console.warn(`Unable to get cache for key "${anonymizeKey(key)}".`, e);
    }

    if (!getFreshValue) {
      return [];
    }

    console.log(
      `Found no match for key "${anonymizeKey(
        key
      )}" in cache. Getting fresh value.`
    );
    return this.getRefreshed(key, getFreshValue);
  }

  public async set(key: string, value: Contact[]): Promise<void> {
    console.log(
      `Saving ${value.length} contacts for key "${anonymizeKey(key)}" to cache.`
    );
    try {
      await this.storage.set(key, value);
    } catch (e) {
      console.warn(`Unable to set cache for key "${anonymizeKey(key)}".`, e);
    }
  }

  public async delete(key: string): Promise<void> {
    console.log(`Removing contacts for key "${anonymizeKey(key)}" from cache.`);
    try {
      await this.storage.delete(key);
    } catch (e) {
      console.warn(`Unable to delete cache for key "${anonymizeKey(key)}".`, e);
    }
  }

  private async getRefreshed(
    key: string,
    getFreshValue: (key: string) => Promise<Contact[]>
  ): Promise<Contact[]> {
    console.info(`Refreshing value for ${anonymizeKey(key)}.`);

    await this.storage.set<CacheItemState>(this.getCacheItemKey(key), {
      state: CacheItemStateType.FETCHING,
    });

    try {
      const freshValue = await getFreshValue(key);

      await this.storage.set<CacheItemState>(this.getCacheItemKey(key), {
        state: CacheItemStateType.CACHED,
        updated: new Date().getTime(),
      });

      if (freshValue) {
        await this.set(key, freshValue);
      }

      return freshValue;
    } catch (error) {
      console.info(
        `Error while refreshing value for ${anonymizeKey(key)}:`,
        error
      );
      this.storage.delete(`${CACHE_STATE_PREFIX}${key}`);
      this.storage.delete(key);
      throw error;
    }
  }

  private getCacheItemKey(key: string) {
    return `${CACHE_STATE_PREFIX}${key}`;
  }
}
