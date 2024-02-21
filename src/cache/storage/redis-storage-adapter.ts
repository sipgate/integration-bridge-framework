import { createClient, RedisClientType } from 'redis';
import { promisify } from 'util';
import {
  InputType,
  deflate as nodeDeflate,
  inflate as nodeInflate,
} from 'zlib';
import { StorageAdapter } from '../../models/storage-adapter.model';

const inflate = promisify<InputType, Buffer>(nodeInflate);
const deflate = promisify<InputType, Buffer>(nodeDeflate);

const DEFAULT_CACHE_TTL: number = 60 * 60 * 24 * 30; // 30 days

export class RedisStorageAdapter implements StorageAdapter {
  private client: RedisClientType<any, any>;

  constructor(url: string) {
    this.client = createClient({ url });

    console.log(`Initialized Redis storage with URL ${url}`);

    this.client.on('error', (error) => {
      console.error('Redis error: ', error.message);
    });

    this.client.on('ready', () => {
      console.info('Redis is ready');
    });

    this.client.on('reconnecting', () => {
      console.warn('Redis is reconnecting');
    });

    this.client
      .connect()
      .then(() => {
        console.info('Redis successfully connected');
      })
      .catch((error) => {
        console.warn('Redis connection error: ', error.message);
      });
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }

    const decompressed = await inflate(Buffer.from(value, 'base64'));
    const result = JSON.parse(decompressed.toString());
    return result;
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const stringified = JSON.stringify(value);
    const compressed = await deflate(stringified);
    await this.client.set(key, compressed.toString('base64'), {
      EX: ttl ?? DEFAULT_CACHE_TTL,
    });
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
