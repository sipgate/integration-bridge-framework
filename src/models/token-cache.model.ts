import { TokenWithStatus } from "./token.model";

export interface TokenCache {
  get: (key: string) => Promise<TokenWithStatus | null>;
  set: (key: string, value: TokenWithStatus, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
