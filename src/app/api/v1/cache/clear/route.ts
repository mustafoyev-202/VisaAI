import { NextRequest } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { requireRole } from "@/lib/security/middleware";
import { apiCache, queryCache, sessionCache } from "@/lib/cache/redis";
import { semanticCacheInstance } from "@/lib/cache/semantic";
import { invalidateQueryCache } from "@/lib/cache/database";
import type { RequestContext } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        // Require admin role
        const authResult = await requireRole(req, "admin");
        if (authResult instanceof Response) {
          return authResult;
        }

        const json = await req.json();
        const cacheType = json.type || "all"; // all, api, query, session, semantic

        let cleared = 0;

        switch (cacheType) {
          case "api":
            await apiCache.invalidate("*");
            cleared++;
            break;

          case "query":
            await invalidateQueryCache();
            cleared++;
            break;

          case "session":
            await sessionCache.invalidate("*");
            cleared++;
            break;

          case "semantic":
            semanticCacheInstance.clear();
            cleared++;
            break;

          case "all":
            await apiCache.invalidate("*");
            await invalidateQueryCache();
            await sessionCache.invalidate("*");
            semanticCacheInstance.clear();
            cleared = 4;
            break;
        }

        return createSuccessResponse(
          {
            cleared,
            cacheType,
            message: `Cleared ${cacheType} cache`,
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in cache clear [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to clear cache",
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

