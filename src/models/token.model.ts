export type Token = {
  accessToken: string | null;
};

export type TokenCacheItem = Token & { isPending: boolean };
