import { TokenCacheItem } from './token.model';

export interface TokenCache {
  get: (key: string) => Promise<TokenCacheItem | null>;
  set: (key: string, value: TokenCacheItem, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
