// Rate Limiting Implementation
// For production, replace with Redis-based implementation

import type { RateLimitInfo, RequestContext } from "./types";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (replace with Redis in production)
const rateLimitStore: RateLimitStore = {};

// Rate limit configurations
const RATE_LIMITS = {
  default: { limit: 100, window: 60 }, // 100 requests per minute
  authenticated: { limit: 500, window: 60 }, // 500 requests per minute
  heavy: { limit: 10, window: 60 }, // 10 requests per minute for heavy operations
  chat: { limit: 50, window: 60 }, // 50 requests per minute for chat
  assessment: { limit: 20, window: 60 }, // 20 requests per minute for assessments
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

export function getRateLimitKey(context: RequestContext, tier: RateLimitTier = "default"): string {
  // Use IP address for anonymous users, user ID for authenticated users
  const identifier = context.userId || context.ip || "anonymous";
  return `rate_limit:${tier}:${identifier}`;
}

export function checkRateLimit(
  context: RequestContext,
  tier: RateLimitTier = "default",
  increment: boolean = true,
): { allowed: boolean; rateLimit: RateLimitInfo } {
  const key = getRateLimitKey(context, tier);
  const config = RATE_LIMITS[tier];
  const now = Math.floor(Date.now() / 1000);

  // Clean up old entries
  if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
    delete rateLimitStore[key];
  }

  // Initialize or get current count
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + config.window,
    };
  }

  const current = rateLimitStore[key];

  // Check if limit exceeded
  if (current.count >= config.limit) {
    const retryAfter = current.resetTime - now;
    return {
      allowed: false,
      rateLimit: {
        limit: config.limit,
        remaining: 0,
        reset: current.resetTime,
        retryAfter: retryAfter > 0 ? retryAfter : 0,
      },
    };
  }

  // Increment count only if requested
  if (increment) {
    current.count += 1;
  }

  return {
    allowed: true,
    rateLimit: {
      limit: config.limit,
      remaining: config.limit - (current.count + (increment ? 0 : 1)),
      reset: current.resetTime,
    },
  };
}

// Reset rate limit for a key (useful for testing or admin actions)
export function resetRateLimit(context: RequestContext, tier: RateLimitTier = "default"): void {
  const key = getRateLimitKey(context, tier);
  delete rateLimitStore[key];
}

// Get current rate limit status without incrementing
export function getRateLimitStatus(
  context: RequestContext,
  tier: RateLimitTier = "default",
): RateLimitInfo {
  const key = getRateLimitKey(context, tier);
  const config = RATE_LIMITS[tier];
  const now = Math.floor(Date.now() / 1000);

  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    return {
      limit: config.limit,
      remaining: config.limit,
      reset: now + config.window,
    };
  }

  const current = rateLimitStore[key];
  return {
    limit: config.limit,
    remaining: Math.max(0, config.limit - current.count),
    reset: current.resetTime,
  };
}

// Redis-based implementation (for production)
// Uncomment and configure when Redis is available
/*
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimitRedis(
  context: RequestContext,
  tier: RateLimitTier = "default",
): Promise<{ allowed: boolean; rateLimit: RateLimitInfo }> {
  const key = getRateLimitKey(context, tier);
  const config = RATE_LIMITS[tier];
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.window;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, config.window);
  }

  const ttl = await redis.ttl(key);
  const reset = now + (ttl > 0 ? ttl : config.window);

  if (count > config.limit) {
    return {
      allowed: false,
      rateLimit: {
        limit: config.limit,
        remaining: 0,
        reset,
        retryAfter: ttl > 0 ? ttl : 0,
      },
    };
  }

  return {
    allowed: true,
    rateLimit: {
      limit: config.limit,
      remaining: config.limit - count,
      reset,
    },
  };
}
*/

