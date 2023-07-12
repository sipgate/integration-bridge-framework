import { TokenStorageCache } from "../cache";
import { MemoryStorageAdapter, RedisStorageAdapter } from "../cache/storage";
import { Config } from "../models";
import { Token } from "../models/token.model";

import { tokenCache } from "..";

export type TokenRefreshFn = (config: Config) => Promise<Token>;

export function getTokenCache() {
  const { REDIS_URL } = process.env;

  if (REDIS_URL) {
    console.log("[TOKEN CACHE] Using Redis cache");
    return new TokenStorageCache(new RedisStorageAdapter(REDIS_URL));
  }

  console.log("[TOKEN CACHE] Using memory cache");
  return new TokenStorageCache(new MemoryStorageAdapter());
}

export async function getFreshAccessToken(
  config: Config,
  refreshFn: TokenRefreshFn,
  force = false
): Promise<string> {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const { userId } = config;

  if (force) {
    const newToken = await getNewToken(config, refreshFn);

    return newToken.access_token;
  }

  const token = await tokenCache.get(userId);

  if (token?.access_token) return token.access_token;

  if (token?.isPending) {
    await sleep(5_000);
    return await getFreshAccessToken(config, refreshFn);
  }

  const newToken = await getNewToken(config, refreshFn);

  return newToken.access_token;
}

async function getNewToken(
  config: Config,
  refreshFn: TokenRefreshFn
): Promise<Token> {
  const { userId } = config;

  await tokenCache.set(
    userId,
    {
      refresh_token: "",
      access_token: "",
      isPending: true,
    },
    5_000
  );

  const newToken = { ...(await refreshFn(config)), isPending: false };

  await tokenCache.set(userId, newToken, 55 * 60_000);

  return newToken;
}
