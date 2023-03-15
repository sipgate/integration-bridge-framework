import LRU from "lru-cache";
import { StorageAdapter } from "../../models/storage-adapter.model";
import sizeof from "../../util/size-of";

export class MemoryStorageAdapter implements StorageAdapter {
  private cache: LRU<string, unknown>;

  constructor() {
    const { MEMORY_CACHE_TTL_MS } = process.env;
    const cacheTtlMs: number =
      Number(MEMORY_CACHE_TTL_MS) || 60 * 60 * 24 * 30 * 1000; // 30 days
    const maxSizeBytes: number = 400 * 1024 * 1024; // 400mb

    this.cache = new LRU({
      maxSize: maxSizeBytes,
      ttl: cacheTtlMs,
      sizeCalculation: sizeof,
    });

    console.log(`Initialized memory cache`);
  }

  public async get<T>(key: string): Promise<T | null> {
    const cached = await this.cache.get<T>(key);
    return cached ?? null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
  }

  public async delete(key: string): Promise<void> {
    this.cache.del(key);
  }
}
