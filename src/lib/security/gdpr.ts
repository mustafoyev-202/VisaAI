// GDPR Compliance Features

import type { User, AuditLog, ConsentRecord, DataExport } from "./types";
import { getUserById, deleteUser, updateUser } from "./auth";
import { revokeAllUserSessions } from "./auth";
import { logAudit } from "./audit";
import crypto from "crypto";

// Consent management
const consentRecords = new Map<string, ConsentRecord[]>();

export async function recordConsent(
  userId: string,
  consentType: ConsentRecord["consentType"],
  granted: boolean,
  ipAddress?: string,
): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    id: crypto.randomUUID(),
    userId,
    consentType,
    granted,
    grantedAt: new Date(),
    revokedAt: granted ? undefined : new Date(),
    version: "1.0",
    ipAddress,
  };

  if (!consentRecords.has(userId)) {
    consentRecords.set(userId, []);
  }
  consentRecords.get(userId)!.push(record);

  await logAudit({
    userId,
    action: granted ? "consent_granted" : "consent_revoked",
    resource: "consent",
    resourceId: record.id,
    ipAddress,
    metadata: { consentType, version: record.version },
    timestamp: new Date(),
    success: true,
  });

  return record;
}

export async function getConsentHistory(userId: string): Promise<ConsentRecord[]> {
  return consentRecords.get(userId) || [];
}

export async function hasConsent(userId: string, consentType: ConsentRecord["consentType"]): Promise<boolean> {
  const history = await getConsentHistory(userId);
  const latest = history
    .filter((r) => r.consentType === consentType)
    .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())[0];

  return latest?.granted === true && !latest.revokedAt;
}

// Right to access (data export)
const dataExports = new Map<string, DataExport>();

export async function requestDataExport(
  userId: string,
  format: DataExport["format"] = "json",
): Promise<DataExport> {
  const exportId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days to download

  const dataExport: DataExport = {
    id: exportId,
    userId,
    format,
    status: "pending",
    requestedAt: new Date(),
    expiresAt,
  };

  dataExports.set(exportId, dataExport);

  await logAudit({
    userId,
    action: "data_export_requested",
    resource: "data_export",
    resourceId: exportId,
    metadata: { format },
    timestamp: new Date(),
    success: true,
  });

  // Process export asynchronously
  processDataExport(exportId).catch(console.error);

  return dataExport;
}

async function processDataExport(exportId: string): Promise<void> {
  const dataExport = dataExports.get(exportId);
  if (!dataExport) return;

  dataExport.status = "processing";

  try {
    const user = await getUserById(dataExport.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Collect all user data
    const userData = {
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      consent: await getConsentHistory(dataExport.userId),
      // Add more data sources as needed
    };

    // Generate export file
    let exportData: string;
    if (dataExport.format === "json") {
      exportData = JSON.stringify(userData, null, 2);
    } else if (dataExport.format === "csv") {
      // Convert to CSV (simplified)
      exportData = "Field,Value\n";
      exportData += Object.entries(userData.profile)
        .map(([key, value]) => `${key},${value}`)
        .join("\n");
    } else {
      // PDF generation would require a library
      exportData = JSON.stringify(userData);
    }

    // Store export (in production, upload to S3 and generate signed URL)
    const fileUrl = `/api/v1/gdpr/exports/${exportId}/download`;
    dataExport.fileUrl = fileUrl;
    dataExport.status = "completed";

    await logAudit({
      userId: dataExport.userId,
      action: "data_export_completed",
      resource: "data_export",
      resourceId: exportId,
      metadata: { format: dataExport.format },
      timestamp: new Date(),
      success: true,
    });
  } catch (error) {
    dataExport.status = "failed";
    await logAudit({
      userId: dataExport.userId,
      action: "data_export_failed",
      resource: "data_export",
      resourceId: exportId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      success: false,
    });
  }
}

export async function getDataExport(exportId: string): Promise<DataExport | null> {
  return dataExports.get(exportId) || null;
}

// Right to erasure (data deletion)
export async function requestDataDeletion(userId: string, ipAddress?: string): Promise<boolean> {
  await logAudit({
    userId,
    action: "data_deletion_requested",
    resource: "user",
    resourceId: userId,
    ipAddress,
    timestamp: new Date(),
    success: true,
  });

  // Revoke all sessions
  revokeAllUserSessions(userId);

  // Delete user data
  const deleted = await deleteUser(userId);

  // Delete consent records
  consentRecords.delete(userId);

  // Delete data exports
  for (const [id, export_] of dataExports.entries()) {
    if (export_.userId === userId) {
      dataExports.delete(id);
    }
  }

  await logAudit({
    userId,
    action: "data_deletion_completed",
    resource: "user",
    resourceId: userId,
    ipAddress,
    timestamp: new Date(),
    success: deleted,
  });

  return deleted;
}

// Right to rectification (data correction)
export async function requestDataCorrection(
  userId: string,
  corrections: Record<string, any>,
  ipAddress?: string,
): Promise<User | null> {
  await logAudit({
    userId,
    action: "data_correction_requested",
    resource: "user",
    resourceId: userId,
    ipAddress,
    metadata: { fields: Object.keys(corrections) },
    timestamp: new Date(),
    success: true,
  });

  const updated = await updateUser(userId, corrections);

  await logAudit({
    userId,
    action: "data_correction_completed",
    resource: "user",
    resourceId: userId,
    ipAddress,
    metadata: { corrections },
    timestamp: new Date(),
    success: !!updated,
  });

  return updated;
}

// Data portability
export async function requestDataPortability(userId: string): Promise<DataExport> {
  return requestDataExport(userId, "json");
}

// Data retention policies
export async function applyRetentionPolicy(days: number = 365): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let deletedCount = 0;

  // Delete old data exports
  for (const [id, export_] of dataExports.entries()) {
    if (export_.expiresAt < new Date()) {
      dataExports.delete(id);
      deletedCount++;
    }
  }

  // Delete old consent records (keep last 7 years for compliance)
  const consentCutoff = new Date();
  consentCutoff.setFullYear(consentCutoff.getFullYear() - 7);

  for (const [userId, records] of consentRecords.entries()) {
    const filtered = records.filter((r) => r.grantedAt > consentCutoff);
    if (filtered.length === 0) {
      consentRecords.delete(userId);
    } else {
      consentRecords.set(userId, filtered);
    }
  }

  return deletedCount;
}

