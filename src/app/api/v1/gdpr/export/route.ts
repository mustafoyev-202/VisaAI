import { NextRequest, NextResponse } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/security/middleware";
import { requestDataExport, getDataExport } from "@/lib/security/gdpr";
import type { RequestContext } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) {
          return authResult;
        }

        const { user } = authResult;
        const json = await req.json();
        const format = json.format || "json";

        const dataExport = await requestDataExport(user.userId, format);

        return createSuccessResponse(
          {
            exportId: dataExport.id,
            status: dataExport.status,
            format: dataExport.format,
            requestedAt: dataExport.requestedAt.toISOString(),
            expiresAt: dataExport.expiresAt.toISOString(),
          },
          undefined,
          202,
        );
      } catch (error) {
        console.error(`Error in GDPR export [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to request data export",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
        );
      }
    },
    {
      enableCORS: true,
    },
  );
}

export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) {
          return authResult;
        }

        const { user } = authResult;
        const { searchParams } = new URL(req.url);
        const exportId = searchParams.get("exportId");

        if (exportId) {
          const dataExport = await getDataExport(exportId);
          if (!dataExport || dataExport.userId !== user.userId) {
            return createErrorResponse(
              "NOT_FOUND",
              "Export not found",
              404,
              {},
              context.requestId,
            );
          }

          return createSuccessResponse(dataExport, undefined, 200);
        }

        // Return all exports for user (simplified - in production, query database)
        return createSuccessResponse(
          {
            exports: [],
            message: "List exports endpoint - implement database query",
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in GDPR export [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to get data export",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
        );
      }
    },
    {
      enableCORS: true,
    },
  );
}

