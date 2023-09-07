import { TokenWithStatus } from '../models';
import { StorageAdapter } from '../models/storage-adapter.model';
import { TokenCache } from '../models/token-cache.model';
import { errorLogger, infoLogger } from '../util';

export class TokenCacheStorage implements TokenCache {
  private LOG_PREFIX = 'TOKEN CACHE';
  private storage: StorageAdapter;

  constructor(storageAdapter: StorageAdapter) {
    this.storage = storageAdapter;
    infoLogger(this.LOG_PREFIX, `Initialized token storage cache.`, undefined);
  }

  public async get(key: string): Promise<TokenWithStatus | null> {
    try {
      infoLogger(this.LOG_PREFIX, 'Trying to get token from cache', key);
      return await this.storage.get<TokenWithStatus>(key);
    } catch (e) {
      errorLogger(this.LOG_PREFIX, `Unable to get token from cache`, key, e);
      return null;
    }
  }

  public async set(
    key: string,
    token: TokenWithStatus,
    ttl?: number,
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
