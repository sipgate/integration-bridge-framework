export enum CacheItemStateType {
  CACHED = "CACHED",
  FETCHING = "FETCHING",
}

export type CacheItemState = {
  state: CacheItemStateType;
  timestamp: number;
};
