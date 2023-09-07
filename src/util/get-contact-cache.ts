import { ContactCacheStorage } from '../cache';
import { MemoryStorageAdapter, RedisStorageAdapter } from '../cache/storage';
import { ContactCache } from '../models';

export function getContactCache(): ContactCache | null {
  const { REDIS_URL, CACHE_DISABLED } = process.env;

  if (CACHE_DISABLED && CACHE_DISABLED === 'true') {
    console.log('[CONTACT CACHE] Caching disabled');
    return null;
  }

  if (REDIS_URL) {
    console.log('[CONTACT CACHE] Using Redis cache');
    return new ContactCacheStorage(new RedisStorageAdapter(REDIS_URL));
  }

  console.log('[CONTACT CACHE] Using memory cache');
  return new ContactCacheStorage(new MemoryStorageAdapter());
}
