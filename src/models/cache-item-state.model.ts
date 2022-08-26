export enum CacheItemStateType {
  CACHED = "CACHED",
  FETCHING = "FETCHING",
}

export interface CacheItemStateCached {
  state: CacheItemStateType.CACHED;
  updated: number;
}

export interface CacheItemStateFetching {
  state: CacheItemStateType.FETCHING;
}

export type CacheItemState = CacheItemStateCached | CacheItemStateFetching;
