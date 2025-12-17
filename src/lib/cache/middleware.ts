// Cache Middleware for API Responses

import { NextRequest, NextResponse } from "next/server";
import { apiCache } from "./redis";
import { semanticCacheInstance } from "./semantic";
import crypto from "crypto";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  useSemanticCache?: boolean; // Use semantic caching for AI responses
  semanticThreshold?: number; // Similarity threshold for semantic cache
  vary?: string[]; // Headers to vary cache by
}

export function generateCacheKey(request: NextRequest, customKey?: string): string {
  if (customKey) {
    return customKey;
  }

  const url = request.url;
  const method = request.method;
  const authHeader = request.headers.get("authorization");
  
  // Include auth in key if present
  const authHash = authHeader ? crypto.createHash("sha256").update(authHeader).digest("hex").substring(0, 8) : "anon";
  
  return `${method}:${url}:${authHash}`;
}

export async function getCachedResponse(
  request: NextRequest,
  options: CacheOptions = {},
): Promise<NextResponse | null> {
  const cacheKey = generateCacheKey(request, options.key);
  
  // Try semantic cache for AI responses
  if (options.useSemanticCache) {
    const body = await request.clone().text();
    if (body) {
      try {
        const json = JSON.parse(body);
        if (json.question || json.query) {
          const query = json.question || json.query;
          const semanticResult = await semanticCacheInstance.searchSimilar(
            query,
            options.semanticThreshold,
          );
          
          if (semanticResult.cached && semanticResult.response) {
            return NextResponse.json(
              {
                success: true,
                data: JSON.parse(semanticResult.response.response),
                cached: true,
                similarity: semanticResult.similarity,
              },
              {
                headers: {
                  "X-Cache": "HIT",
                  "X-Cache-Type": "semantic",
                  "X-Cache-Similarity": semanticResult.similarity?.toFixed(3) || "1.000",
                },
              },
            );
          }
        }
      } catch {
        // Not JSON or invalid, continue to regular cache
      }
    }
  }

  // Try regular cache
  const cached = await apiCache.get<{ status: number; body: any; headers: Record<string, string> }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: {
        ...cached.headers,
        "X-Cache": "HIT",
        "X-Cache-Type": "redis",
      },
    });
  }

  return null;
}

export async function setCachedResponse(
  request: NextRequest,
  response: NextResponse,
  options: CacheOptions = {},
): Promise<void> {
  const cacheKey = generateCacheKey(request, options.key);
  const ttl = options.ttl || 3600;

  // Cache semantic response for AI queries
  if (options.useSemanticCache) {
    const body = await request.clone().text();
    if (body) {
      try {
        const json = JSON.parse(body);
        if (json.question || json.query) {
          const query = json.question || json.query;
          const responseBody = await response.clone().json();
          
          if (responseBody.success && responseBody.data) {
            await semanticCacheInstance.cacheResponse(
              query,
              JSON.stringify(responseBody.data),
              ttl,
              { cacheKey },
            );
          }
        }
      } catch {
        // Not JSON or invalid, continue to regular cache
      }
    }
  }

  // Cache regular response
  const responseBody = await response.clone().json().catch(() => null);
  if (responseBody) {
    await apiCache.set(
      cacheKey,
      {
        status: response.status,
        body: responseBody,
        headers: Object.fromEntries(response.headers.entries()),
      },
      ttl,
    );
  }
}

export function addCacheHeaders(
  response: NextResponse,
  ttl: number = 3600,
  publicCache: boolean = false,
): NextResponse {
  const cacheControl = publicCache
    ? `public, max-age=${ttl}, s-maxage=${ttl}`
    : `private, max-age=${ttl}`;

  response.headers.set("Cache-Control", cacheControl);
  response.headers.set("Vary", "Accept, Authorization");

  // ETag for cache validation
  const etag = crypto.randomBytes(16).toString("hex");
  response.headers.set("ETag", `"${etag}"`);

  return response;
}

export function checkETag(request: NextRequest, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  return ifNoneMatch === `"${etag}"` || ifNoneMatch === etag;
}

export async function withCache<T>(
  request: NextRequest,
  handler: () => Promise<NextResponse<T>>,
  options: CacheOptions = {},
): Promise<NextResponse<T>> {
  // Check cache first
  const cached = await getCachedResponse(request, options);
  if (cached) {
    return cached as NextResponse<T>;
  }

  // Execute handler
  const response = await handler();

  // Only cache successful responses
  if (response.status >= 200 && response.status < 300) {
    await setCachedResponse(request, response, options);
    addCacheHeaders(response, options.ttl, false);
  }

  return response;
}

