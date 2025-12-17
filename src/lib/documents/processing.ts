// Document Processing Pipeline

import type {
  DocumentUpload,
  DocumentMetadata,
  DocumentProcessingJob,
  ProcessingStage,
} from "./types";
import { processOCR, extractFields, classifyDocument } from "./ocr";
import { validateDocumentMetadata, needsManualReview } from "./validation";
import { createStorageProvider, type StorageProvider } from "./storage";
import { generateThumbnail, generatePreview } from "./preview";
import crypto from "crypto";

// Processing queue (in-memory for MVP, use Redis/BullMQ in production)
const processingQueue: DocumentProcessingJob[] = [];
const activeJobs = new Map<string, DocumentProcessingJob>();

export class DocumentProcessor {
  private storageProvider: StorageProvider;

  constructor(storageProvider?: StorageProvider) {
    this.storageProvider = storageProvider || createStorageProvider();
  }

  async queueDocument(documentId: string, priority: "low" | "normal" | "high" = "normal"): Promise<DocumentProcessingJob> {
    const job: DocumentProcessingJob = {
      id: crypto.randomUUID(),
      documentId,
      stages: [
        { stage: "validation", status: "pending" },
        { stage: "storage", status: "pending" },
        { stage: "thumbnail", status: "pending" },
        { stage: "ocr", status: "pending" },
        { stage: "extraction", status: "pending" },
        { stage: "classification", status: "pending" },
        { stage: "validation", status: "pending" },
        { stage: "indexing", status: "pending" },
      ],
      currentStage: 0,
      status: "queued",
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    processingQueue.push(job);
    this.sortQueue();

    // Start processing if not already processing
    if (activeJobs.size === 0) {
      this.processQueue();
    }

    return job;
  }

  private sortQueue(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    processingQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private async processQueue(): Promise<void> {
    while (processingQueue.length > 0) {
      const job = processingQueue.shift();
      if (!job) break;

      activeJobs.set(job.id, job);
      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        if (job.retryCount < job.maxRetries) {
          job.retryCount += 1;
          job.status = "queued";
          processingQueue.push(job);
          this.sortQueue();
        } else {
          job.status = "failed";
          const stage = job.stages[job.currentStage];
          if (stage) {
            stage.status = "failed";
            stage.error = error instanceof Error ? error.message : String(error);
            stage.completedAt = new Date();
          }
        }
      } finally {
        activeJobs.delete(job.id);
        job.updatedAt = new Date();
      }
    }
  }

  private async processJob(job: DocumentProcessingJob): Promise<void> {
    job.status = "processing";

    for (let i = job.currentStage; i < job.stages.length; i++) {
      job.currentStage = i;
      const stage = job.stages[i];
      stage.status = "processing";
      stage.startedAt = new Date();

      try {
        await this.executeStage(stage, job);
        stage.status = "completed";
        stage.completedAt = new Date();
      } catch (error) {
        stage.status = "failed";
        stage.error = error instanceof Error ? error.message : String(error);
        stage.completedAt = new Date();
        throw error;
      }
    }

    job.status = "completed";
  }

  private async executeStage(stage: ProcessingStage, job: DocumentProcessingJob): Promise<void> {
    const document = await this.storageProvider.getMetadata(job.documentId);
    if (!document) {
      throw new Error(`Document not found: ${job.documentId}`);
    }

    switch (stage.stage) {
      case "validation":
        // Already validated on upload
        break;

      case "storage":
        // Already stored on upload
        break;

      case "thumbnail":
        const fileBuffer = await this.storageProvider.download(document.storageLocation);
        const thumbnail = await generateThumbnail(fileBuffer);
        // Store thumbnail (simplified for MVP)
        document.thumbnailUrl = `/thumbnails/${job.documentId}`;
        break;

      case "ocr":
        const ocrBuffer = await this.storageProvider.download(document.storageLocation);
        const ocrResult = await processOCR(ocrBuffer);
        // Store OCR result (in production, store in database)
        (document as any).ocrResult = ocrResult;
        break;

      case "extraction":
        const ocrText = (document as any).ocrResult?.text || "";
        const documentType = (document as any).documentType || "unknown";
        const extractedFields = extractFields(ocrText, documentType);
        (document as any).extractedFields = extractedFields;
        break;

      case "classification":
        const classificationText = (document as any).ocrResult?.text || "";
        const classification = await classifyDocument(classificationText, document.fileName);
        (document as any).documentType = classification.type;
        (document as any).classificationConfidence = classification.confidence;
        break;

      case "indexing":
        // Index document for search (in production, add to search index)
        break;
    }
  }

  async getJobStatus(jobId: string): Promise<DocumentProcessingJob | null> {
    const active = activeJobs.get(jobId);
    if (active) return active;

    const queued = processingQueue.find((j) => j.id === jobId);
    return queued || null;
  }
}

// Watermarking
export async function addWatermark(
  fileBuffer: Buffer,
  watermarkText: string,
): Promise<Buffer> {
  // In production, use image processing library to add watermark
  // For MVP, prepend watermark text to buffer
  const watermark = Buffer.from(`WATERMARK: ${watermarkText}\n`);
  return Buffer.concat([watermark, fileBuffer]);
}

// Backup and replication
export async function backupDocument(
  storageProvider: StorageProvider,
  key: string,
  backupLocation: string,
): Promise<void> {
  const buffer = await storageProvider.download(key);
  // In production, upload to backup location
  console.log(`Backed up ${key} to ${backupLocation}`);
}

export async function replicateDocument(
  storageProvider: StorageProvider,
  key: string,
  replicas: number = 3,
): Promise<string[]> {
  const buffer = await storageProvider.download(key);
  const replicaKeys: string[] = [];

  for (let i = 0; i < replicas; i++) {
    const replicaKey = `${key}.replica.${i}`;
    await storageProvider.upload(buffer, `replica-${i}`, {
      id: crypto.randomUUID(),
      fileName: `replica-${i}`,
      fileType: "replica",
      fileSize: buffer.length,
      mimeType: "application/octet-stream",
      uploadedAt: new Date(),
      status: "completed",
      storageTier: "hot",
      storageLocation: replicaKey,
    });
    replicaKeys.push(replicaKey);
  }

  return replicaKeys;
}

export const documentProcessor = new DocumentProcessor();

