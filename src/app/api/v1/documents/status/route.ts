import { NextRequest } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import type { RequestContext } from "@/lib/api/types";
import { documentProcessor } from "@/lib/documents/processing";
import { createStorageProvider } from "@/lib/documents/storage";

export async function GET(request: NextRequest) {
  return withMiddleware<unknown>(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get("documentId");
        const jobId = searchParams.get("jobId");

        if (!documentId && !jobId) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "documentId or jobId is required",
            400,
            {},
            context.requestId,
          );
        }

        if (jobId) {
          const job = await documentProcessor.getJobStatus(jobId);
          if (!job) {
            return createErrorResponse(
              "NOT_FOUND",
              "Job not found",
              404,
              {},
              context.requestId,
            );
          }

          return createSuccessResponse(
            {
              jobId: job.id,
              documentId: job.documentId,
              status: job.status,
              currentStage: job.currentStage,
              stages: job.stages,
              progress: Math.round((job.currentStage / job.stages.length) * 100),
              createdAt: job.createdAt.toISOString(),
              updatedAt: job.updatedAt.toISOString(),
            },
            undefined,
            200,
          );
        }

        if (documentId) {
          const storageProvider = createStorageProvider();
          const document = await storageProvider.getMetadata(documentId);

          if (!document) {
            return createErrorResponse(
              "NOT_FOUND",
              "Document not found",
              404,
              {},
              context.requestId,
            );
          }

          return createSuccessResponse(
            {
              documentId: document.id,
              fileName: document.fileName,
              fileSize: document.fileSize,
              mimeType: document.mimeType,
              status: document.status,
              storageTier: document.storageTier,
              thumbnailUrl: document.thumbnailUrl,
              previewUrl: document.previewUrl,
              uploadedAt: document.uploadedAt.toISOString(),
            },
            undefined,
            200,
          );
        }

        return createErrorResponse(
          "VALIDATION_ERROR",
          "Invalid request",
          400,
          {},
          context.requestId,
        );
      } catch (error) {
        console.error(`Error in document status [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to get document status",
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

