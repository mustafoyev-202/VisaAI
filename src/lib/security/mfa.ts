// Multi-Factor Authentication (MFA)

import crypto from "crypto";
import type { MFAToken } from "./types";

// TOTP implementation (RFC 6238)
export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString("base32");
}

export function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(time, 4);

  const key = Buffer.from(secret, "base32");
  const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);

  const otp = (code % 1000000).toString().padStart(6, "0");
  return otp;
}

export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);

  // Check current time step and adjacent windows
  for (let i = -window; i <= window; i++) {
    const expectedToken = generateTOTP(secret, timeStep);
    if (token === expectedToken) {
      return true;
    }
  }

  return false;
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

export function verifyBackupCode(codes: string[], code: string): boolean {
  const index = codes.indexOf(code.toUpperCase());
  if (index === -1) return false;
  codes.splice(index, 1); // Remove used code
  return true;
}

// SMS OTP (mock implementation - integrate with SMS provider in production)
export async function sendSMSOTP(phoneNumber: string): Promise<string> {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // In production, send via Twilio, AWS SNS, etc.
  console.log(`SMS OTP for ${phoneNumber}: ${otp}`);
  
  return otp;
}

// Store OTP temporarily (in production, use Redis with TTL)
const smsOTPs = new Map<string, { code: string; expiresAt: Date }>();

export function storeSMSOTP(phoneNumber: string, code: string, expiresIn: number = 300): void {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
  smsOTPs.set(phoneNumber, { code, expiresAt });
}

export function verifySMSOTP(phoneNumber: string, code: string): boolean {
  const stored = smsOTPs.get(phoneNumber);
  if (!stored) return false;
  if (stored.expiresAt < new Date()) {
    smsOTPs.delete(phoneNumber);
    return false;
  }
  if (stored.code !== code) return false;
  smsOTPs.delete(phoneNumber);
  return true;
}

// Passwordless authentication (magic link)
export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Store magic link tokens (in production, use Redis with TTL)
const magicLinks = new Map<string, { userId: string; expiresAt: Date }>();

export function storeMagicLink(token: string, userId: string, expiresIn: number = 900): void {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
  magicLinks.set(token, { userId, expiresAt });
}

export function verifyMagicLink(token: string): string | null {
  const stored = magicLinks.get(token);
  if (!stored) return null;
  if (stored.expiresAt < new Date()) {
    magicLinks.delete(token);
    return null;
  }
  magicLinks.delete(token);
  return stored.userId;
}

