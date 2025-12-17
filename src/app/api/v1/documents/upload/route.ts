import { NextRequest } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import type { RequestContext } from "@/lib/api/types";
import {
  validateFileType,
  validateFileSize,
  validateFileName,
  scanForMalware,
} from "@/lib/documents/validation";
import { createStorageProvider } from "@/lib/documents/storage";
import { documentProcessor } from "@/lib/documents/processing";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "No file provided",
            400,
            {},
            context.requestId,
          );
        }

        // Validate file name
        const fileNameValidation = validateFileName(file.name);
        if (!fileNameValidation.valid) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            fileNameValidation.error || "Invalid file name",
            400,
            {},
            context.requestId,
          );
        }

        // Validate file type
        const typeValidation = validateFileType(file.type);
        if (!typeValidation.valid) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            typeValidation.error || "Invalid file type",
            400,
            {},
            context.requestId,
          );
        }

        // Validate file size
        const sizeValidation = validateFileSize(file.size);
        if (!sizeValidation.valid) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            sizeValidation.error || "File too large",
            400,
            {},
            context.requestId,
          );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Malware scan
        const malwareScan = await scanForMalware(fileBuffer, file.name);
        if (!malwareScan.clean) {
          return createErrorResponse(
            "SECURITY_ERROR",
            `File failed security scan: ${malwareScan.threat}`,
            400,
            { threat: malwareScan.threat },
            context.requestId,
          );
        }

        // Generate document ID
        const documentId = crypto.randomUUID();

        // Upload to storage
        const storageProvider = createStorageProvider();
        const { location, key } = await storageProvider.upload(
          fileBuffer,
          file.name,
          {
            id: documentId,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            status: "pending",
            storageTier: "hot",
            uploadedAt: new Date(),
          },
        );

        // Queue for processing
        const job = await documentProcessor.queueDocument(documentId, "normal");

        return createSuccessResponse(
          {
            documentId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            status: "processing",
            jobId: job.id,
            uploadedAt: new Date().toISOString(),
          },
          undefined,
          201,
        );
      } catch (error) {
        console.error(`Error in document upload [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to upload document",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
          "/api/v1/docs#errors",
        );
      }
    },
    {
      rateLimitTier: "heavy",
      enableCompression: true,
      enableCORS: true,
    },
  );
}

