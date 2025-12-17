import { NextRequest } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { getMetrics, getProviderStats, getAlerts } from "@/lib/ai/monitoring";
import type { RequestContext } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const { searchParams } = new URL(req.url);
        const provider = searchParams.get("provider");
        const startDate = searchParams.get("startDate")
          ? new Date(searchParams.get("startDate")!)
          : undefined;
        const endDate = searchParams.get("endDate")
          ? new Date(searchParams.get("endDate")!)
          : undefined;
        const includeAlerts = searchParams.get("alerts") === "true";

        const metrics = await getMetrics(provider || undefined, startDate, endDate);

        // Get provider stats if provider specified
        const stats = provider
          ? await getProviderStats(provider)
          : undefined;

        // Get alerts if requested
        const alerts = includeAlerts ? await getAlerts(false) : undefined;

        return createSuccessResponse(
          {
            metrics: metrics.slice(-100), // Last 100 metrics
            stats,
            alerts,
            summary: {
              totalRequests: metrics.length,
              successfulRequests: metrics.filter((m) => m.success).length,
              failedRequests: metrics.filter((m) => !m.success).length,
              avgLatency:
                metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length || 0,
              avgTokens:
                metrics.reduce((sum, m) => sum + m.totalTokens, 0) / metrics.length || 0,
            },
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in monitoring [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to fetch monitoring data",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
          "/api/v1/docs#errors",
        );
      }
    },
    {
      rateLimitTier: "default",
      enableCORS: true,
    },
  );
}

