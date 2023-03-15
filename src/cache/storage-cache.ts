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
    const anonKey = anonymizeKey(key);

    try {
      this.log(`[${anonKey}] Trying to get contacts from cache`);

      const cacheItemState = await this.storage.get<CacheItemState>(
        this.getCacheItemKey(key)
      );

      const contacts = await this.storage.get<Contact[]>(key);

      if (cacheItemState?.state === CacheItemStateType.FETCHING) {
        this.log(
          `[${anonKey}] Not refreshing contacts, because cache state is FETCHING`
        );

        // if we have old contacts saved in cache we return them instead
        if (contacts && contacts?.length > 0) {
          this.log(
            `[${anonKey}] Returning previously cached contacts (${contacts.length}), because new contacts are still being fetched`
          );
          return contacts;
        }

        return cacheItemState;
      }

      if (contacts) {
        this.log(`[${anonKey}] Found ${contacts.length} contacts in cache`);

        const now: number = new Date().getTime();

        const isValueStale: boolean = Boolean(
          !cacheItemState ||
            (cacheItemState.state === CacheItemStateType.CACHED &&
              now > cacheItemState.updated + this.cacheRefreshIntervalMs)
        );

        if (getFreshValue && isValueStale) {
          this.log(
            `[${anonKey}] cached value was stale, fetching fresh contacts`
          );
          // we don't return the fresh value here because we don't want to wait on the result.
          // We return the old value instead, the fresh value is returned the next time it is requested
          this.getRefreshed(key, getFreshValue).catch((error) => {
            this.logErr(`[${anonKey}] Unable to get fresh contacts`, error);
          });
        }

        return contacts;
      }
    } catch (e) {
      this.logErr(`[${anonKey}] Unable to get cache".`, e);
    }

    if (!getFreshValue) {
      this.log(
        `[${anonKey}] No getFreshValue function provided - returning empty array`
      );
      return [];
    }

    this.log(`[${anonKey}] Found no match in cache. Getting fresh value.`);
    return this.getRefreshed(key, getFreshValue);
  }

  public async set(key: string, contacts: Contact[]): Promise<void> {
    const anonKey = anonymizeKey(key);
    this.log(`[${anonKey}] Saving ${contacts.length} contacts to cache`);
    try {
      await this.storage.set(key, contacts);
    } catch (e) {
      this.logErr(`[${anonKey}] Unable to set cache`, e);
    }
  }

  public async delete(key: string): Promise<void> {
    const anonKey = anonymizeKey(key);
    this.log(`[${anonKey}] Removing contacts from cache`);
    try {
      await this.storage.delete(key);
    } catch (e) {
      this.logErr(`[${anonKey}] Unable to delete cache`, e);
    }
  }

  private async getRefreshed(
    key: string,
    getFreshValue: (key: string) => Promise<Contact[]>
  ): Promise<Contact[]> {
    const anonKey = anonymizeKey(key);

    this.log(`[${anonKey}] Setting cache state to FETCHING`);

    await this.storage.set<CacheItemState>(
      this.getCacheItemKey(key),
      {
        state: CacheItemStateType.FETCHING,
      },
      CACHE_STATE_SECONDS_TTL
    );

    try {
      const freshValue = await getFreshValue(key);

      await this.set(key, freshValue);

      this.log(`[${anonKey}] Setting cache state to CACHED`);

      await this.storage.set<CacheItemState>(this.getCacheItemKey(key), {
        state: CacheItemStateType.CACHED,
        updated: Date.now(),
      });

      return freshValue;
    } catch (error) {
      this.log(`[${anonKey}] Error while refreshing value`, error);
      await this.storage.delete(this.getCacheItemKey(key));
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
