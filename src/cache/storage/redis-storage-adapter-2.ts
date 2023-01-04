import { createClient, RedisClientType } from "redis";
import { StorageAdapter } from "../../models/storage-adapter.model";
import { anonymizeKey } from "../../util";

const DEFAULT_CACHE_TTL: number = 60 * 60 * 24 * 30; // 30 days

export class RedisStorageAdapter2 implements StorageAdapter {
  private client: RedisClientType<any, any>;

  constructor(url: string) {
    this.client = createClient({ url });

    console.log(`Initialized Redis2 storage with URL ${url}`);

    this.client.on("error", (error) => {
      console.warn("Redis2 error: ", error.message);
    });

    this.client.on("ready", () => {
      console.info("Redis2 is ready.");
    });

    this.client.on("reconnecting", () => {
      console.warn("Redis2 is reconnecting.");
    });

    this.client
      .connect()
      .then(() => {
        console.info("Redis2 successfully connected.");
      })
      .catch((error) => {
        console.warn("Redis2 connection error: ", error.message);
      });
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      console.time(`${anonymizeKey(key)}-json-parse-cache`);
      const result = JSON.parse(value.toString());
      console.timeEnd(`${anonymizeKey(key)}-json-parse-cache`);

      return result;
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const stringified = JSON.stringify(value);
    await this.client.set(key, stringified, {
      EX: ttl ?? DEFAULT_CACHE_TTL,
    });
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
