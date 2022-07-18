import LRU from "lru-cache";
import { StorageAdapter } from "../../models/storage-adapter.model";
import sizeof from "../../util/size-of";

export class MemoryStorageAdapter<T> implements StorageAdapter<T> {
  private cache: LRU<string, T>;

  constructor() {
    const { MEMORY_CACHE_TTL_MS } = process.env;
    const cacheTtlMs: number =
      Number(MEMORY_CACHE_TTL_MS) || 60 * 60 * 24 * 30 * 1000; // 30 days
    const maxSizeBytes: number = 400 * 1024 * 1024; // 400mb

    this.cache = new LRU({
      maxSize: maxSizeBytes,
      ttl: cacheTtlMs,
      length: sizeof,
    });

    console.log(`Initialized Memory storage`);
  }

  public async get(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    return cached ? cached : null;
  }

  public async set(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
  }

  public async delete(key: string): Promise<void> {
    this.cache.del(key);
  }
}
