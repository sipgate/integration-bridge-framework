import { TokenCacheItem } from '../models';
import { StorageAdapter } from '../models/storage-adapter.model';
import { TokenCache } from '../models/token-cache.model';
import { errorLogger, infoLogger } from '../util';

export class TokenCacheStorage implements TokenCache {
  private storage: StorageAdapter;
  private logPrefix = 'TOKEN CACHE';
  private keyPrefix: string;

  constructor(storageAdapter: StorageAdapter, keyPrefix: string) {
    this.storage = storageAdapter;
    this.keyPrefix = keyPrefix;
    infoLogger(this.logPrefix, `Initialized token storage cache.`);
  }

  public async get(key: string): Promise<TokenCacheItem | null> {
    const keyWithPrefix = this.buildKey(key);
    try {
      return await this.storage.get<TokenCacheItem>(keyWithPrefix);
    } catch (e) {
      errorLogger(
        this.logPrefix,
        `Unable to get token from cache`,
        keyWithPrefix,
        e,
      );
      return null;
    }
  }

  public async set(
    key: string,
    token: TokenCacheItem,
    ttl?: number,
  ): Promise<void> {
    const keyWithPrefix = this.buildKey(key);
    infoLogger(this.logPrefix, `Saving token to cache`, keyWithPrefix);
    try {
      await this.storage.set(keyWithPrefix, token, ttl);
    } catch (e) {
      errorLogger(this.logPrefix, `Unable to set cache`, keyWithPrefix, e);
    }
  }

  public async delete(key: string): Promise<void> {
    const keyWithPrefix = this.buildKey(key);
    infoLogger(this.logPrefix, `Removing token from cache`, keyWithPrefix);
    try {
      await this.storage.delete(keyWithPrefix);
    } catch (e) {
      errorLogger(
        this.logPrefix,
        `Unable to remove token from cache`,
        keyWithPrefix,
        e,
      );
    }
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }
}
