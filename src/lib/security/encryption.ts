// Data Encryption & Security

import crypto from "crypto";
import type { EncryptionKey } from "./types";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Key management (in production, use AWS KMS, HashiCorp Vault, etc.)
let masterKey: Buffer;

function getMasterKey(): Buffer {
  if (!masterKey) {
    const keyFromEnv = process.env.ENCRYPTION_KEY;
    if (keyFromEnv) {
      masterKey = Buffer.from(keyFromEnv, "hex");
    } else {
      // Generate key for development (NOT for production!)
      masterKey = crypto.randomBytes(32);
      console.warn("WARNING: Using generated encryption key. Set ENCRYPTION_KEY in production!");
    }
  }
  return masterKey;
}

// Derive key from master key and field name
function deriveKey(fieldName: string): Buffer {
  const master = getMasterKey();
  return crypto.pbkdf2Sync(master, fieldName, 10000, 32, "sha256");
}

// Field-level encryption
export function encryptField(value: string, fieldName: string): string {
  const key = deriveKey(fieldName);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv + tag + encrypted data
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

export function decryptField(encryptedValue: string, fieldName: string): string {
  const key = deriveKey(fieldName);
  const combined = Buffer.from(encryptedValue, "base64");

  const iv = combined.slice(0, IV_LENGTH);
  const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

// Encrypt PII fields
const PII_FIELDS = [
  "email",
  "phoneNumber",
  "passportNumber",
  "accountNumber",
  "ssn",
  "dateOfBirth",
  "address",
];

export function encryptPII(data: Record<string, any>): Record<string, any> {
  const encrypted: Record<string, any> = { ...data };

  for (const field of PII_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === "string") {
      encrypted[field] = encryptField(encrypted[field], field);
    }
  }

  return encrypted;
}

export function decryptPII(data: Record<string, any>): Record<string, any> {
  const decrypted: Record<string, any> = { ...data };

  for (const field of PII_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === "string") {
      try {
        decrypted[field] = decryptField(decrypted[field], field);
      } catch {
        // If decryption fails, field might not be encrypted
      }
    }
  }

  return decrypted;
}

// Data masking for logs
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return "**@**";
  const masked = local[0] + "*".repeat(Math.min(local.length - 2, 3)) + local[local.length - 1];
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return "*".repeat(phone.length - 4) + phone.slice(-4);
}

export function maskSSN(ssn: string): string {
  if (ssn.length !== 9) return "***-**-****";
  return `***-**-${ssn.slice(-4)}`;
}

export function maskAccountNumber(account: string): string {
  if (account.length <= 4) return "****";
  return `****${account.slice(-4)}`;
}

export function maskData(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = { ...data };

  if (masked.email) masked.email = maskEmail(masked.email);
  if (masked.phoneNumber) masked.phoneNumber = maskPhone(masked.phoneNumber);
  if (masked.ssn) masked.ssn = maskSSN(masked.ssn);
  if (masked.accountNumber) masked.accountNumber = maskAccountNumber(masked.accountNumber);
  if (masked.passportNumber) masked.passportNumber = "****" + masked.passportNumber.slice(-4);

  return masked;
}

// Input sanitization
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

// Output encoding (for HTML)
export function encodeHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Output encoding (for JSON)
export function encodeJSON(input: string): string {
  return JSON.stringify(input);
}

// Secure key rotation
export function rotateEncryptionKey(): EncryptionKey {
  const newKey = crypto.randomBytes(32);
  const keyId = crypto.randomUUID();

  // In production, store in key management service
  const encryptionKey: EncryptionKey = {
    id: keyId,
    keyId,
    algorithm: ALGORITHM,
    createdAt: new Date(),
    active: true,
  };

  // Update master key (in production, use key management service)
  masterKey = newKey;

  return encryptionKey;
}

