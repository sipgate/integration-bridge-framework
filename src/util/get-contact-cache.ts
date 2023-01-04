import { StorageCache } from "../cache";
import {
  MemoryStorageAdapter,
  RedisStorageAdapter,
  RedisStorageAdapter2,
} from "../cache/storage";
import { ContactCache } from "../models";

export function getContactCache(
  experimentalCache: boolean
): ContactCache | null {
  const { REDIS_URL, CACHE_DISABLED } = process.env;

  if (CACHE_DISABLED && CACHE_DISABLED === "true") {
    console.log("[CACHE] Caching disabled");
    return null;
  }

  if (REDIS_URL) {
    if (experimentalCache) {
      return new StorageCache(new RedisStorageAdapter2(REDIS_URL));
    }
    console.log("[CACHE] Using redis cache");
    return new StorageCache(new RedisStorageAdapter(REDIS_URL));
  }

  console.log("[CACHE] Using memory cache");
  return new StorageCache(new MemoryStorageAdapter());
}
