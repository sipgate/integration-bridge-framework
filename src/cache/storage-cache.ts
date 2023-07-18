import { Contact, ContactCache } from "../models";
import {
  CacheItemState,
  CacheItemStateType,
} from "../models/cache-item-state.model";
import { StorageAdapter } from "../models/storage-adapter.model";
import { TokenCache } from "../models/token-cache.model";
import { TokenWithStatus } from "../models/token.model";
import { errorLogger, infoLogger } from "../util";

const CACHE_STATE_PREFIX = "cache-state:";
const CACHE_STATE_SECONDS_TTL = 1800; // 30 minutes

export class StorageCache implements ContactCache {
  private LOG_PREFIX = "CONTACT CACHE";
  private storage: StorageAdapter;
  private cacheRefreshIntervalMs = 30 * 60 * 1000; // 30 minutes

  constructor(storageAdapter: StorageAdapter) {
    this.storage = storageAdapter;

    const { CACHE_REFRESH_INTERVAL } = process.env;

    if (CACHE_REFRESH_INTERVAL) {
      this.cacheRefreshIntervalMs =
        Math.max(Number(CACHE_REFRESH_INTERVAL), 1) * 1000;
    }

    infoLogger(
      this.LOG_PREFIX,
      `Initialized storage cache with maximum refresh interval of ${
        this.cacheRefreshIntervalMs / 1000
      }s.`,
      undefined
    );
  }

  public async get(
    key: string,
    getFreshValue?: (key: string) => Promise<Contact[]>
  ): Promise<Contact[] | CacheItemState> {
    try {
      infoLogger(this.LOG_PREFIX, "Trying to get contacts from cache", key);

      const cacheItemState = await this.storage.get<CacheItemState>(
        this.getCacheItemKey(key)
      );

      const contacts = await this.storage.get<Contact[]>(key);

      if (cacheItemState?.state === CacheItemStateType.FETCHING) {
        infoLogger(
          this.LOG_PREFIX,
          "Not refreshing contacts, because cache state is FETCHING",
          key
        );

        // if we have old contacts saved in cache we return them instead
        if (contacts && contacts?.length > 0) {
          infoLogger(
            this.LOG_PREFIX,
            `Returning previously cached contacts (${contacts.length}), because new contacts are still being fetched`,
            key
          );
          return contacts;
        }

        return cacheItemState;
      }

      if (contacts) {
        infoLogger(
          this.LOG_PREFIX,
          `Found ${contacts.length} contacts in cache`,
          key
        );

        const now: number = new Date().getTime();

        const isValueStale: boolean = Boolean(
          !cacheItemState ||
            (cacheItemState.state === CacheItemStateType.CACHED &&
              now > cacheItemState.timestamp + this.cacheRefreshIntervalMs)
        );

        if (getFreshValue && isValueStale) {
          infoLogger(
            this.LOG_PREFIX,
            `Cached value was stale, fetching fresh contacts`,
            key
          );

          // we don't return the fresh value here because we don't want to wait on the result.
          // We return the old value instead, the fresh value is returned the next time it is requested
          this.getRefreshed(key, getFreshValue).catch((error: unknown) => {
            errorLogger(
              this.LOG_PREFIX,
              `Unable to get fresh contacts`,
              key,
              error
            );
          });
        }

        return contacts;
      }
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Unable to get contacts from cache`, key, e);
    }

    if (!getFreshValue) {
      infoLogger(
        this.LOG_PREFIX,
        `No "getFreshValue" function provided - returning empty array`,
        key
      );
      return [];
    }

    infoLogger(
      this.LOG_PREFIX,
      `Found no match in cache. Getting fresh value`,
      key
    );
    return this.getRefreshed(key, getFreshValue);
  }

  public async set(key: string, contacts: Contact[]): Promise<void> {
    infoLogger(
      this.LOG_PREFIX,
      `Saving ${contacts.length} contacts to cache`,
      key
    );
    try {
      await this.storage.set(key, contacts);
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Unable to set cache`, key, e);
    }
  }

  private async setCacheState(
    key: string,
    state: CacheItemStateType,
    ttl?: number
  ): Promise<void> {
    infoLogger(this.LOG_PREFIX, `Setting cache state to ${state}`, key);
    try {
      await this.storage.set(
        this.getCacheItemKey(key),
        {
          timestamp: Date.now(),
          state,
        },
        ttl
      );
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Unable to set cache state`, key, e);
    }
  }

  public async delete(key: string): Promise<void> {
    infoLogger(this.LOG_PREFIX, `Removing contacts from cache`, key);
    try {
      await this.storage.delete(key);
    } catch (e) {
      errorLogger(
        this.LOG_PREFIX,
        `Unable to remove contacts from cache`,
        key,
        e
      );
    }
  }

  private async getRefreshed(
    key: string,
    getFreshValue: (key: string) => Promise<Contact[]>
  ): Promise<Contact[]> {
    await this.setCacheState(
      key,
      CacheItemStateType.FETCHING,
      CACHE_STATE_SECONDS_TTL
    );

    try {
      const freshValue = await getFreshValue(key);

      await this.set(key, freshValue);
      await this.setCacheState(key, CacheItemStateType.CACHED);

      return freshValue;
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Error while refreshing value`, key, e);
      await this.storage.delete(this.getCacheItemKey(key));
      throw e;
    }
  }

  private getCacheItemKey(key: string) {
    return `${CACHE_STATE_PREFIX}${key}`;
  }
}

export class TokenStorageCache implements TokenCache {
  private LOG_PREFIX = "TOKEN CACHE";
  private storage: StorageAdapter;

  constructor(storageAdapter: StorageAdapter) {
    this.storage = storageAdapter;

    infoLogger(this.LOG_PREFIX, `Initialized token storage cache.`, undefined);
  }

  public async get(key: string): Promise<TokenWithStatus | null> {
    try {
      infoLogger(this.LOG_PREFIX, "Trying to get token from cache", key);
      return await this.storage.get<TokenWithStatus>(key);
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Unable to get token from cache`, key, e);
      return null;
    }
  }

  public async set(
    key: string,
    token: TokenWithStatus,
    ttl?: number
  ): Promise<void> {
    infoLogger(this.LOG_PREFIX, `Saving token to cache`, key);
    try {
      await this.storage.set(key, token, ttl);
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Unable to set cache`, key, e);
    }
  }

  public async delete(key: string): Promise<void> {
    infoLogger(this.LOG_PREFIX, `Removing token from cache`, key);
    try {
      await this.storage.delete(key);
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Unable to remove token from cache`, key, e);
    }
  }
}
