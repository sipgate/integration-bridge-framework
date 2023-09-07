import { infoLogger, tokenCache } from '..';
import { TokenCacheStorage } from '../cache';
import { MemoryStorageAdapter, RedisStorageAdapter } from '../cache/storage';
import { Config, ServerError } from '../models';
import { Token } from '../models/token.model';

const REFRESH_MARKER_TTL = 5;
const DEFAULT_TTL = 3540;
let KEY_PREFIX: string;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function useCollection(value: string) {
  return `${KEY_PREFIX}:${value.replace(/:/g, '_')}`;
}

export type TokenRefreshFn = (config: Config) => Promise<Token>;

function getTokenCacheTtl(): number {
  const { TOKEN_CACHE_TTL } = process.env;

  const ttlFromEnv = Number(TOKEN_CACHE_TTL);

  return !isNaN(ttlFromEnv) ? ttlFromEnv : DEFAULT_TTL;
}

export function getTokenCache() {
  const { REDIS_URL, INTEGRATION_NAME, OAUTH2_REDIRECT_URL } = process.env;

  // if oauth is not configured, token cache is not needed
  if (!OAUTH2_REDIRECT_URL) {
    infoLogger(
      'TOKEN CACHE',
      'No OAUTH2_REDIRECT_URL provided, skipping token cache initialization.',
    );

    return null;
  }

  if (REDIS_URL) {
    if (INTEGRATION_NAME) {
      KEY_PREFIX = INTEGRATION_NAME;
    } else {
      throw new ServerError(
        500,
        'Could not specify KEY_PREFIX for getTokenCache, missing environment variable INTEGRATION_NAME',
      );
    }
    infoLogger(`TOKEN CACHE`, `Using Redis cache with prefix ${KEY_PREFIX}`);
    return new TokenCacheStorage(new RedisStorageAdapter(REDIS_URL));
  }

  const tokenCacheTtl = getTokenCacheTtl();

  infoLogger('TOKEN CACHE', `Using memory cache with TTL of ${tokenCacheTtl}s`);

  return new TokenCacheStorage(new MemoryStorageAdapter(tokenCacheTtl));
}

export async function getFreshAccessToken(
  config: Config,
  refreshFn: TokenRefreshFn,
  force = false,
): Promise<string> {
  if (!tokenCache) {
    throw new ServerError(
      500,
      'Tried getting token from cache while cache was undefined.',
    );
  }

  if (force) {
    const newToken = await getNewToken(config, refreshFn);

    return newToken.access_token;
  }

  const token = await tokenCache?.get(useCollection(config.apiKey));

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
  if (!tokenCache) {
    throw new ServerError(
      500,
      'Tried getting token from cache while cache was undefined.',
    );
  }

  await tokenCache?.set(
    useCollection(config.apiKey),
    {
      refresh_token: '',
      access_token: '',
      isPending: true,
    },
    REFRESH_MARKER_TTL,
  );

  const newToken = { ...(await refreshFn(config)), isPending: false };

  await tokenCache?.set(
    useCollection(config.apiKey),
    newToken,
    getTokenCacheTtl(),
  );

  return newToken;
}
