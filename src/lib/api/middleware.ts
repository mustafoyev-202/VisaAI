// API Middleware Functions

import { NextRequest, NextResponse } from "next/server";
import { createRequestContext, createErrorResponse, addRateLimitHeaders, addCacheHeaders, addCompressionHeaders, addCORSHeaders } from "./response";
import { checkRateLimit, type RateLimitTier } from "./rateLimit";
import type { RequestContext } from "./types";

export interface MiddlewareOptions {
  rateLimitTier?: RateLimitTier;
  requireAuth?: boolean;
  cacheMaxAge?: number;
  enableCompression?: boolean;
  enableCORS?: boolean;
}

export async function withMiddleware<T>(
  request: NextRequest,
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse<T>>,
  options: MiddlewareOptions = {},
): Promise<NextResponse<T>> {
  const context = createRequestContext(request);

  // Add request ID to headers for tracing
  const response = new NextResponse();
  response.headers.set("X-Request-ID", context.requestId);

  // Handle CORS preflight
  if (request.method === "OPTIONS" && options.enableCORS) {
    return addCORSHeaders(response, request.headers.get("origin") || undefined);
  }

  // Rate limiting
  if (options.rateLimitTier) {
    const rateLimitCheck = checkRateLimit(context, options.rateLimitTier);
    if (!rateLimitCheck.allowed) {
      const errorResponse = createErrorResponse(
        "RATE_LIMIT_EXCEEDED",
        `Rate limit exceeded. Please retry after ${rateLimitCheck.rateLimit.retryAfter || 60} seconds.`,
        429,
        { retryAfter: rateLimitCheck.rateLimit.retryAfter },
        context.requestId,
      );
      return addRateLimitHeaders(errorResponse, rateLimitCheck.rateLimit) as NextResponse<T>;
    }
  }

  // Authentication check (placeholder - implement based on your auth system)
  if (options.requireAuth) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "Authentication required",
        401,
        {},
        context.requestId,
      ) as NextResponse<T>;
    }
    // Extract user ID from token (implement based on your auth system)
    // context.userId = extractUserIdFromToken(authHeader);
  }

  try {
    // Execute handler
    const handlerResponse = await handler(request, context);

    // Add rate limit headers if rate limiting was applied
    if (options.rateLimitTier) {
      const rateLimitStatus = checkRateLimit(context, options.rateLimitTier, false);
      addRateLimitHeaders(handlerResponse, rateLimitStatus.rateLimit);
    }

    // Add cache headers
    if (options.cacheMaxAge) {
      addCacheHeaders(handlerResponse, options.cacheMaxAge);
    }

    // Add compression headers
    if (options.enableCompression) {
      addCompressionHeaders(handlerResponse);
    }

    // Add CORS headers
    if (options.enableCORS) {
      addCORSHeaders(handlerResponse, request.headers.get("origin") || undefined);
    }

    // Ensure request ID is in response
    handlerResponse.headers.set("X-Request-ID", context.requestId);

    return handlerResponse;
  } catch (error) {
    console.error(`Error in API handler [${context.requestId}]:`, error);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred",
      500,
      process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
      context.requestId,
    ) as NextResponse<T>;
  }
}

// Request deduplication (simple in-memory implementation)
const pendingRequests = new Map<string, Promise<NextResponse>>();

export function withDeduplication<T>(
  request: NextRequest,
  handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse<T>>,
  keyGenerator?: (req: NextRequest) => string,
): Promise<NextResponse<T>> {
  const key = keyGenerator
    ? keyGenerator(request)
    : `${request.method}:${request.url}:${request.headers.get("if-none-match") || ""}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)! as Promise<NextResponse<T>>;
  }

  const context = createRequestContext(request);
  const promise = handler(request, context).finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Exponential backoff helper
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

