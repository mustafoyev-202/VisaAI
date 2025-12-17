// Audit Logging

import type { AuditLog } from "./types";
import { maskData } from "./encryption";
import crypto from "crypto";

// Audit log store (in production, use database or logging service)
const auditLogs: AuditLog[] = [];

export async function logAudit(log: Omit<AuditLog, "id">): Promise<AuditLog> {
  const auditLog: AuditLog = {
    ...log,
    id: crypto.randomUUID(),
  };

  // Mask PII in metadata
  if (auditLog.metadata) {
    auditLog.metadata = maskData(auditLog.metadata);
  }

  auditLogs.push(auditLog);

  // Keep only last 10000 logs (in production, use database)
  if (auditLogs.length > 10000) {
    auditLogs.shift();
  }

  // In production, also send to logging service (CloudWatch, Datadog, etc.)
  console.log(`[AUDIT] ${auditLog.action} on ${auditLog.resource} by ${auditLog.userId || "anonymous"}`);

  return auditLog;
}

export async function getAuditLogs(
  userId?: string,
  resource?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100,
): Promise<AuditLog[]> {
  let filtered = auditLogs;

  if (userId) {
    filtered = filtered.filter((log) => log.userId === userId);
  }

  if (resource) {
    filtered = filtered.filter((log) => log.resource === resource);
  }

  if (startDate) {
    filtered = filtered.filter((log) => log.timestamp >= startDate);
  }

  if (endDate) {
    filtered = filtered.filter((log) => log.timestamp <= endDate);
  }

  return filtered
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  return auditLogs.find((log) => log.id === id) || null;
}

