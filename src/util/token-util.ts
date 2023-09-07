import { infoLogger, tokenCache, warnLogger } from '..';
import { TokenStorageCache } from '../cache';
import { MemoryStorageAdapter, RedisStorageAdapter } from '../cache/storage';
import { Config, ServerError } from '../models';
import { Token } from '../models/token.model';

const REFRESH_MARKER_TTL = 5;
const DEFAULT_TTL = '3540';

let KEY_PREFIX: string;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function useCollection(value: string) {
  return `${KEY_PREFIX}:${value.replace(/:/g, '_')}`;
}

export type TokenRefreshFn = (config: Config) => Promise<Token>;

export function getTokenCache() {
  const {
    REDIS_URL,
    INTEGRATION_NAME,
    OAUTH2_IDENTIFIER,
    OAUTH2_REDIRECT_URL,
  } = process.env;

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
    } else if (OAUTH2_IDENTIFIER) {
      warnLogger(
        'TOKEN CACHE',
        'Using OAUTH2_IDENTIFIER is deprecated, specify INTEGRATION_NAME instead.',
      );
      KEY_PREFIX = OAUTH2_IDENTIFIER;
    } else {
      throw new ServerError(
        500,
        'Could not specify KEY_PREFIX for getTokenCache, missing environment variable INTEGRATION_NAME.',
      );
    }

    infoLogger(`TOKEN CACHE`, `Using Redis cache with prefix ${KEY_PREFIX}`);
    return new TokenStorageCache(new RedisStorageAdapter(REDIS_URL));
  }

  const { TOKEN_CACHE_TTL } = process.env;

  infoLogger(
    'TOKEN CACHE',
    `Using memory cache with TTL ${TOKEN_CACHE_TTL || DEFAULT_TTL}`,
  );

  return new TokenStorageCache(
    new MemoryStorageAdapter(parseInt(TOKEN_CACHE_TTL || DEFAULT_TTL)),
  );
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
    parseInt(process.env.TOKEN_CACHE_TTL || DEFAULT_TTL),
  );

  return newToken;
}
