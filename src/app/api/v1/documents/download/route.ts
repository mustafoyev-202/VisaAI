import { NextRequest, NextResponse } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import type { RequestContext } from "@/lib/api/types";
import { createStorageProvider } from "@/lib/documents/storage";
import { addWatermark } from "@/lib/documents/processing";

export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const { searchParams } = new URL(req.url);
        const key = searchParams.get("key");
        const token = searchParams.get("token");
        const expires = searchParams.get("expires");
        const watermark = searchParams.get("watermark") === "true";
        const watermarkText = searchParams.get("watermarkText") || "CONFIDENTIAL";

        if (!key) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "Document key is required",
            400,
            {},
            context.requestId,
          );
        }

        // Validate token and expiration (simplified for MVP)
        if (expires && parseInt(expires) < Date.now()) {
          return createErrorResponse(
            "UNAUTHORIZED",
            "Signed URL has expired",
            401,
            {},
            context.requestId,
          );
        }

        const storageProvider = createStorageProvider();
        const exists = await storageProvider.exists(key);
        if (!exists) {
          return createErrorResponse(
            "NOT_FOUND",
            "Document not found",
            404,
            {},
            context.requestId,
          );
        }

        let fileBuffer = await storageProvider.download(key);

        // Add watermark if requested
        if (watermark) {
          fileBuffer = await addWatermark(fileBuffer, watermarkText);
        }

        // Return file with appropriate headers
        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${key}"`,
            "Cache-Control": "private, max-age=3600",
            "X-Request-ID": context.requestId,
          },
        });
      } catch (error) {
        console.error(`Error in document download [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to download document",
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

