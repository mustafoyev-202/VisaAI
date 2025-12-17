import { NextRequest } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { apiCache, queryCache, sessionCache } from "@/lib/cache/redis";
import { semanticCacheInstance } from "@/lib/cache/semantic";
import type { RequestContext } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const apiStats = await apiCache.getStats();
        const queryStats = await queryCache.getStats();
        const sessionStats = await sessionCache.getStats();
        const semanticSize = semanticCacheInstance.size();

        return createSuccessResponse(
          {
            api: {
              ...apiStats,
              type: "redis",
            },
            query: {
              ...queryStats,
              type: "redis",
            },
            session: {
              ...sessionStats,
              type: "redis",
            },
            semantic: {
              size: semanticSize,
              type: "in-memory",
            },
            summary: {
              totalHits: apiStats.hits + queryStats.hits + sessionStats.hits,
              totalMisses: apiStats.misses + queryStats.misses + sessionStats.misses,
              totalSize: apiStats.size + queryStats.size + sessionStats.size + semanticSize,
              overallHitRate:
                (apiStats.hits + queryStats.hits + sessionStats.hits) /
                (apiStats.hits +
                  queryStats.hits +
                  sessionStats.hits +
                  apiStats.misses +
                  queryStats.misses +
                  sessionStats.misses) || 0,
            },
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in cache stats [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to get cache statistics",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
        );
      }
    },
    {
      rateLimitTier: "default",
      enableCORS: true,
    },
  );
}

