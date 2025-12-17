// Storage Abstraction Layer

import type { DocumentUpload, StorageConfig, SignedUrlOptions } from "./types";
import crypto from "crypto";

// In-memory storage for MVP (replace with S3/Azure/GCP in production)
const storage: Map<string, { buffer: Buffer; metadata: DocumentUpload }> = new Map();

export interface StorageProvider {
  upload(
    fileBuffer: Buffer,
    fileName: string,
    metadata: Partial<DocumentUpload>,
  ): Promise<{ location: string; key: string }>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  generateSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  getMetadata(key: string): Promise<DocumentUpload | null>;
  exists(key: string): Promise<boolean>;
}

// Local file system storage (for development)
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = "./uploads") {
    this.basePath = basePath;
  }

  async upload(
    fileBuffer: Buffer,
    fileName: string,
    metadata: Partial<DocumentUpload>,
  ): Promise<{ location: string; key: string }> {
    const key = this.generateKey(fileName, metadata.userId);
    const location = `${this.basePath}/${key}`;

    // Store in memory (in production, write to file system or cloud storage)
    storage.set(key, {
      buffer: fileBuffer,
      metadata: {
        id: metadata.id || crypto.randomUUID(),
        fileName,
        fileType: this.getFileType(fileName),
        fileSize: fileBuffer.length,
        mimeType: metadata.mimeType || "application/octet-stream",
        uploadedAt: new Date(),
        status: "pending",
        storageTier: "hot",
        storageLocation: location,
        ...metadata,
      } as DocumentUpload,
    });

    return { location, key };
  }

  async download(key: string): Promise<Buffer> {
    const stored = storage.get(key);
    if (!stored) {
      throw new Error(`File not found: ${key}`);
    }
    return stored.buffer;
  }

  async delete(key: string): Promise<void> {
    storage.delete(key);
  }

  async generateSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const expiresIn = options?.expiresIn || 3600; // Default 1 hour
    const expiresAt = Date.now() + expiresIn * 1000;

    // In production, generate actual signed URL
    // For MVP, return a temporary URL
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const token = crypto.randomBytes(32).toString("hex");
    
    // Store token with expiration (in production, use Redis or database)
    return `${baseUrl}/api/v1/documents/download/${key}?token=${token}&expires=${expiresAt}`;
  }

  async getMetadata(key: string): Promise<DocumentUpload | null> {
    const stored = storage.get(key);
    return stored?.metadata || null;
  }

  async exists(key: string): Promise<boolean> {
    return storage.has(key);
  }

  private generateKey(fileName: string, userId?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const prefix = userId ? `user-${userId}/` : "public/";
    return `${prefix}${timestamp}-${random}-${sanitized}`;
  }

  private getFileType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const typeMap: Record<string, string> = {
      pdf: "pdf",
      jpg: "image",
      jpeg: "image",
      png: "image",
      tiff: "image",
      bmp: "image",
    };
    return typeMap[ext] || "unknown";
  }
}

// S3-compatible storage (for production)
export class S3StorageProvider implements StorageProvider {
  private config: StorageConfig;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.config = config;
    this.bucket = config.bucket || "visa-documents";
  }

  async upload(
    fileBuffer: Buffer,
    fileName: string,
    metadata: Partial<DocumentUpload>,
  ): Promise<{ location: string; key: string }> {
    // In production, use AWS SDK or compatible library
    // const s3 = new S3Client({ ... });
    // await s3.putObject({ Bucket: this.bucket, Key: key, Body: fileBuffer });
    
    // For MVP, fallback to local storage
    const local = new LocalStorageProvider();
    return local.upload(fileBuffer, fileName, metadata);
  }

  async download(key: string): Promise<Buffer> {
    // In production, download from S3
    const local = new LocalStorageProvider();
    return local.download(key);
  }

  async delete(key: string): Promise<void> {
    // In production, delete from S3
    const local = new LocalStorageProvider();
    return local.delete(key);
  }

  async generateSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    // In production, use S3 getSignedUrl
    // const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    // return await getSignedUrl(s3Client, command, { expiresIn: options?.expiresIn });
    
    const local = new LocalStorageProvider();
    return local.generateSignedUrl(key, options);
  }

  async getMetadata(key: string): Promise<DocumentUpload | null> {
    const local = new LocalStorageProvider();
    return local.getMetadata(key);
  }

  async exists(key: string): Promise<boolean> {
    const local = new LocalStorageProvider();
    return local.exists(key);
  }
}

// Storage factory
export function createStorageProvider(config?: StorageConfig): StorageProvider {
  if (!config || config.provider === "local") {
    return new LocalStorageProvider();
  }

  if (config.provider === "s3") {
    return new S3StorageProvider(config);
  }

  // Default to local
  return new LocalStorageProvider();
}

// Tiered storage management
export async function moveToTier(
  provider: StorageProvider,
  key: string,
  tier: "hot" | "warm" | "cold",
): Promise<void> {
  const metadata = await provider.getMetadata(key);
  if (!metadata) {
    throw new Error(`Document not found: ${key}`);
  }

  // Update metadata
  metadata.storageTier = tier;
  
  // In production, move actual file to appropriate storage tier
  // For MVP, just update metadata
  console.log(`Moved ${key} to ${tier} storage`);
}

// Automatic archival
export async function archiveOldDocuments(
  provider: StorageProvider,
  daysOld: number = 90,
): Promise<string[]> {
  const archived: string[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // In production, query database for old documents
  // For MVP, iterate through storage
  for (const [key, stored] of storage.entries()) {
    if (stored.metadata.uploadedAt < cutoffDate && stored.metadata.storageTier !== "cold") {
      await moveToTier(provider, key, "cold");
      archived.push(key);
    }
  }

  return archived;
}

// Object versioning
export async function createVersion(
  provider: StorageProvider,
  key: string,
  newBuffer: Buffer,
): Promise<string> {
  const timestamp = Date.now();
  const versionKey = `${key}.v${timestamp}`;
  
  const metadata = await provider.getMetadata(key);
  await provider.upload(newBuffer, metadata?.fileName || "document", {
    ...metadata,
    id: crypto.randomUUID(),
  });

  return versionKey;
}

