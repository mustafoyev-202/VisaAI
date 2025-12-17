// Security Types and Interfaces

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  name?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  ipWhitelist?: string[];
  role: "user" | "admin" | "moderator";
  consentGiven: boolean;
  consentDate?: Date;
  dataRetentionConsent?: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface RefreshToken {
  token: string;
  userId: string;
  sessionId: string;
  expiresAt: Date;
  createdAt: Date;
  revoked: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface Session {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  revoked: boolean;
}

export interface MFAToken {
  userId: string;
  secret: string;
  backupCodes: string[];
  enabled: boolean;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: "data_processing" | "marketing" | "analytics" | "cookies";
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  version: string;
  ipAddress?: string;
}

export interface DataExport {
  id: string;
  userId: string;
  format: "json" | "csv" | "pdf";
  status: "pending" | "processing" | "completed" | "failed";
  fileUrl?: string;
  requestedAt: Date;
  expiresAt: Date;
}

export interface EncryptionKey {
  id: string;
  keyId: string;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

