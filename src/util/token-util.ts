import { infoLogger, PubSubClient, tokenCache } from '..';
import { TokenCacheStorage } from '../cache';
import { MemoryStorageAdapter, RedisStorageAdapter } from '../cache/storage';
import { Config, ServerError } from '../models';
import { Token } from '../models/token.model';
import assert from 'node:assert';

const REFRESH_MARKER_TTL = 5;
const DEFAULT_TTL = 3540;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type TokenRefreshFn = (config: Config) => Promise<Token>;

function getTokenCacheTtl(): number {
  const { TOKEN_CACHE_TTL } = process.env;

  const ttlFromEnv = Number(TOKEN_CACHE_TTL);

  return !isNaN(ttlFromEnv) ? ttlFromEnv : DEFAULT_TTL;
}

export function getTokenCache() {
  const { REDIS_URL, INTEGRATION_NAME, OAUTH2_REDIRECT_URL } = process.env;

  // if OAuth2 is not configured, token cache is not needed
  if (!OAUTH2_REDIRECT_URL) {
    infoLogger(
      'TOKEN CACHE',
      'No OAUTH2_REDIRECT_URL provided, skipping token cache initialization.',
    );

    return null;
  }

  let keyPrefix: string = 'AUTH';

  if (REDIS_URL) {
    if (INTEGRATION_NAME) {
      keyPrefix = `AUTH:${INTEGRATION_NAME}`;
    } else {
      throw new ServerError(
        500,
        'Could not specify KEY_PREFIX for getTokenCache, missing environment variable INTEGRATION_NAME',
      );
    }
    infoLogger(`TOKEN CACHE`, `Using Redis cache with prefix ${keyPrefix}`);
    return new TokenCacheStorage(new RedisStorageAdapter(REDIS_URL), keyPrefix);
  }

  const tokenCacheTtl = getTokenCacheTtl();

  infoLogger('TOKEN CACHE', `Using memory cache with TTL of ${tokenCacheTtl}s`);

  return new TokenCacheStorage(
    new MemoryStorageAdapter(tokenCacheTtl),
    keyPrefix,
  );
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

  await tokenCache.set(
    config.apiKey,
    {
      accessToken: null,
      isPending: true,
    },
    REFRESH_MARKER_TTL,
  );

  const newToken = { ...(await refreshFn(config)), isPending: false };

  await tokenCache.set(config.apiKey, newToken, getTokenCacheTtl());

  return newToken;
}

export async function getFreshAccessToken(
  config: Config,
  refreshFn: TokenRefreshFn,
  force = false,
): Promise<string | null> {
  if (!tokenCache) {
    throw new ServerError(
      500,
      'Tried getting token from cache while cache was undefined.',
    );
  }

  if (force) {
    const newToken = await getNewToken(config, refreshFn);
    return newToken.accessToken;
  }

  const token = await tokenCache.get(config.apiKey);

  if (token?.accessToken) {
    return token.accessToken;
  }

  if (token?.isPending) {
    await sleep(5_000);
    return await getFreshAccessToken(config, refreshFn);
  }

  const newToken = await getNewToken(config, refreshFn);

  return newToken.accessToken;
}

export async function updateProviderKey(
  config: Config,
  accessToken: string,
  providerKey: string,
) {
  if (!tokenCache) {
    throw new ServerError(
      500,
      'Tried getting token from cache while cache was undefined.',
    );
  }

  const newToken = { accessToken, isPending: false };
  await tokenCache.set(providerKey, newToken, getTokenCacheTtl());
  const { PUBSUB_TOPIC_NAME_UPDATE_PROVIDER_KEY } = process.env;

  assert(
    PUBSUB_TOPIC_NAME_UPDATE_PROVIDER_KEY,
    'PUBSUB_TOPIC_NAME_UPDATE_PROVIDER_KEY is not defined',
  );

  const pubSubClient = new PubSubClient(PUBSUB_TOPIC_NAME_UPDATE_PROVIDER_KEY);
  await pubSubClient.publishMessage({
    userId: config.userId,
    providerKey,
    accessToken,
  });
}
