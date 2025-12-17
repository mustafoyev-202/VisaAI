// Redis Caching Implementation

import type { CacheConfig, CacheStats } from "./types";

// Redis client interface (replace with actual Redis client in production)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// Mock Redis client for MVP (replace with ioredis or node-redis in production)
class MockRedisClient implements RedisClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    this.stats.size = this.store.size;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.stats.size = this.store.size;
  }

  async exists(key: string): Promise<boolean> {
    const item = this.store.get(key);
    if (!item) return false;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + ttl * 1000;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// Redis cache wrapper
export class RedisCache {
  private client: RedisClient;
  private prefix: string;

  constructor(prefix: string = "visa:cache:", client?: RedisClient) {
    this.prefix = prefix;
    this.client = client || new MockRedisClient();
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(this.getKey(key));
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await this.client.set(this.getKey(key), serialized, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.getKey(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.client.exists(this.getKey(key));
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.client.keys(this.getKey(pattern));
    for (const key of keys) {
      await this.client.del(key);
    }
  }

  async getStats(): Promise<CacheStats> {
    if (this.client instanceof MockRedisClient) {
      return this.client.getStats();
    }
    // In production, get stats from Redis INFO command
    return { hits: 0, misses: 0, size: 0, hitRate: 0 };
  }
}

// Production Redis client initialization (commented out - uncomment when Redis is available)
/*
import Redis from 'ioredis';

export function createRedisClient(): RedisClient {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  });

  return {
    async get(key: string): Promise<string | null> {
      return redis.get(key);
    },
    async set(key: string, value: string, ttl?: number): Promise<void> {
      if (ttl) {
        await redis.setex(key, ttl, value);
      } else {
        await redis.set(key, value);
      }
    },
    async del(key: string): Promise<void> {
      await redis.del(key);
    },
    async exists(key: string): Promise<boolean> {
      const result = await redis.exists(key);
      return result === 1;
    },
    async expire(key: string, ttl: number): Promise<void> {
      await redis.expire(key, ttl);
    },
    async keys(pattern: string): Promise<string[]> {
      return redis.keys(pattern);
    },
  };
}
*/

// Singleton instances
export const sessionCache = new RedisCache("visa:session:");
export const apiCache = new RedisCache("visa:api:");
export const queryCache = new RedisCache("visa:query:");

