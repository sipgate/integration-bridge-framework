import LRU from 'lru-cache';
import { StorageAdapter } from '../../models/storage-adapter.model';
import sizeof from '../../util/size-of';

export class MemoryStorageAdapter implements StorageAdapter {
  private cache: LRU<string, unknown>;

  constructor(ttl?: number) {
    const { MEMORY_CACHE_TTL_SECONDS } = process.env;
    const cacheTtlInSeconds: number =
      Number(MEMORY_CACHE_TTL_SECONDS) || 60 * 60 * 24 * 30; // 30 days
    const maxSizeBytes: number = 400 * 1024 * 1024; // 400mb

    this.cache = new LRU({
      maxSize: maxSizeBytes,
      ttl: (ttl || cacheTtlInSeconds) * 1000,
      sizeCalculation: sizeof,
    });

    console.log(`Initialized memory cache`);
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    return null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
  }

  public async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}
