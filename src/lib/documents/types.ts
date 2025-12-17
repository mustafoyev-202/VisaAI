// Document Processing Types

export interface DocumentUpload {
  id: string;
  userId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  status: "pending" | "processing" | "completed" | "failed" | "review";
  storageTier: "hot" | "warm" | "cold";
  storageLocation: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  signedUrl?: string;
  signedUrlExpires?: Date;
}

export interface DocumentMetadata {
  documentId: string;
  documentType?: string;
  confidence: number;
  extractedFields: Record<string, {
    value: string;
    confidence: number;
    validated: boolean;
  }>;
  ocrText: string;
  ocrConfidence: number;
  pageCount: number;
  language?: string;
  processedAt: Date;
}

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
}

export interface DocumentValidation {
  documentId: string;
  isValid: boolean;
  errors: Array<{
    field: string;
    error: string;
    severity: "error" | "warning" | "info";
  }>;
  warnings: string[];
  validatedAt: Date;
}

export interface ProcessingStage {
  stage: string;
  status: "pending" | "processing" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface DocumentProcessingJob {
  id: string;
  documentId: string;
  stages: ProcessingStage[];
  currentStage: number;
  status: "queued" | "processing" | "completed" | "failed";
  priority: "low" | "normal" | "high";
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
}

export interface StorageConfig {
  provider: "s3" | "local" | "azure" | "gcp";
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  download?: boolean;
  watermark?: boolean;
  watermarkText?: string;
}

