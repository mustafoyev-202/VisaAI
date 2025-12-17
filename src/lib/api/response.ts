import { NextResponse } from "next/server";
import type { APIResponse, APIError, RateLimitInfo, RequestContext } from "./types";

export function createSuccessResponse<T>(
  data: T,
  meta?: APIResponse<T>["meta"],
  status: number = 200,
): NextResponse<APIResponse<T>> {
  const response: APIResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  return NextResponse.json(response, { status });
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>,
  requestId?: string,
  documentationUrl?: string,
): NextResponse<APIResponse<never>> {
  const error: APIError = {
    code,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
    requestId: requestId || "unknown",
    ...(documentationUrl && { documentation_url: documentationUrl }),
  };

  const response: APIResponse<never> = {
    success: false,
    error,
  };

  return NextResponse.json(response, { status });
}

export function createRateLimitResponse(
  retryAfter: number,
  requestId: string,
): NextResponse<APIResponse<never>> {
  return createErrorResponse(
    "RATE_LIMIT_EXCEEDED",
    `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
    429,
    { retryAfter },
    requestId,
  );
}

export function addRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitInfo,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());
  if (rateLimit.retryAfter) {
    response.headers.set("Retry-After", rateLimit.retryAfter.toString());
  }
  return response;
}

export function addCacheHeaders(
  response: NextResponse,
  maxAge: number = 3600,
  etag?: string,
): NextResponse {
  response.headers.set("Cache-Control", `public, max-age=${maxAge}, s-maxage=${maxAge}`);
  if (etag) {
    response.headers.set("ETag", etag);
  }
  return response;
}

export function addCompressionHeaders(response: NextResponse): NextResponse {
  // Next.js handles compression automatically, but we can add hints
  response.headers.set("Vary", "Accept-Encoding");
  return response;
}

export function addCORSHeaders(
  response: NextResponse,
  origin?: string,
): NextResponse {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];
  const allowOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins.includes("*")
        ? "*"
        : allowedOrigins[0];

  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

export function createRequestContext(request: Request): RequestContext {
  const requestId = crypto.randomUUID();
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return {
    requestId,
    ip,
    userAgent,
    timestamp: new Date(),
  };
}

