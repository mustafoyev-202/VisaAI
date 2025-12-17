// Database Query Result Caching

import { queryCache } from "./redis";
import crypto from "crypto";

export interface QueryCacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[]; // Cache tags for invalidation
}

export function generateQueryKey(query: string, params?: Record<string, any>): string {
  const queryHash = crypto.createHash("sha256").update(query).digest("hex").substring(0, 16);
  const paramsHash = params
    ? crypto.createHash("sha256").update(JSON.stringify(params)).digest("hex").substring(0, 16)
    : "no-params";
  return `query:${queryHash}:${paramsHash}`;
}

export async function getCachedQuery<T>(
  query: string,
  params?: Record<string, any>,
  options: QueryCacheOptions = {},
): Promise<T | null> {
  const key = options.key || generateQueryKey(query, params);
  return queryCache.get<T>(key);
}

export async function setCachedQuery<T>(
  query: string,
  result: T,
  params?: Record<string, any>,
  options: QueryCacheOptions = {},
): Promise<void> {
  const key = options.key || generateQueryKey(query, params);
  const ttl = options.ttl || 300; // Default 5 minutes for query cache

  await queryCache.set(key, result, ttl);

  // Store tags for invalidation
  if (options.tags && options.tags.length > 0) {
    for (const tag of options.tags) {
      const tagKey = `tag:${tag}`;
      const existing = await queryCache.get<string[]>(tagKey) || [];
      if (!existing.includes(key)) {
        existing.push(key);
        await queryCache.set(tagKey, existing, ttl);
      }
    }
  }
}

export async function invalidateQueryCache(tags?: string[]): Promise<void> {
  if (tags && tags.length > 0) {
    // Invalidate by tags
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const keys = await queryCache.get<string[]>(tagKey) || [];
      for (const key of keys) {
        await queryCache.delete(key);
      }
      await queryCache.delete(tagKey);
    }
  } else {
    // Invalidate all query cache
    await queryCache.invalidate("query:*");
  }
}

export async function getCachedQueryOrExecute<T>(
  query: string,
  executor: () => Promise<T>,
  params?: Record<string, any>,
  options: QueryCacheOptions = {},
): Promise<T> {
  const cached = await getCachedQuery<T>(query, params, options);
  if (cached !== null) {
    return cached;
  }

  const result = await executor();
  await setCachedQuery(query, result, params, options);
  return result;
}

// Example usage:
/*
const user = await getCachedQueryOrExecute(
  "SELECT * FROM users WHERE id = $1",
  async () => {
    return db.query("SELECT * FROM users WHERE id = $1", [userId]);
  },
  { id: userId },
  { ttl: 600, tags: ["user", `user:${userId}`] }
);
*/

