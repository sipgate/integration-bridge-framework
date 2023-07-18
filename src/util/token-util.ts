import { TokenStorageCache } from '../cache';
import { MemoryStorageAdapter, RedisStorageAdapter } from '../cache/storage';
import { Config, ServerError } from '../models';
import { Token } from '../models/token.model';

import { tokenCache } from '..';

const REFRESH_MARKER_TTL = 5;

function useCollection(value: string) {
  const { INTEGRATION_NAME } = process.env;

  if (!INTEGRATION_NAME) {
    return value;
  }

  return `${INTEGRATION_NAME}:${value.replace(/:/g, '_')}`;
}

export type TokenRefreshFn = (config: Config) => Promise<Token>;

export function getTokenCache() {
  const { REDIS_URL, INTEGRATION_NAME } = process.env;

  if (REDIS_URL) {
    if (!INTEGRATION_NAME)
      throw new ServerError(
        500,
        'Missing INTEGRATION_NAME variable, cannot initialize Redis token cache.',
      );

    console.log(
      `[TOKEN CACHE] Using Redis cache for integration ${INTEGRATION_NAME}`,
    );

    return new TokenStorageCache(new RedisStorageAdapter(REDIS_URL));
  }

  console.log('[TOKEN CACHE] Using memory cache');
  const { TOKEN_CACHE_TTL } = process.env;
  return new TokenStorageCache(
    new MemoryStorageAdapter(parseInt(TOKEN_CACHE_TTL || '60')),
  );
}

export async function getFreshAccessToken(
  config: Config,
  refreshFn: TokenRefreshFn,
  force = false,
): Promise<string> {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  if (force) {
    const newToken = await getNewToken(config, refreshFn);

    return newToken.access_token;
  }

  const token = await tokenCache.get(useCollection(config.apiKey));

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
  refreshFn: TokenRefreshFn,
): Promise<Token> {
  await tokenCache.set(
    useCollection(config.apiKey),
    {
      refresh_token: '',
      access_token: '',
      isPending: true,
    },
    REFRESH_MARKER_TTL,
  );

  const newToken = { ...(await refreshFn(config)), isPending: false };

  await tokenCache.set(
    useCollection(config.apiKey),
    newToken,
    parseInt(process.env.TOKEN_CACHE_TTL || '60'),
  );

  return newToken;
}
