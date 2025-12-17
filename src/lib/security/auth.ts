// Authentication & Authorization

import crypto from "crypto";
import type { User, JWTPayload, RefreshToken, Session } from "./types";

// In-memory stores (replace with database/Redis in production)
const users = new Map<string, User>();
const refreshTokens = new Map<string, RefreshToken>();
const sessions = new Map<string, Session>();

// JWT Secret (in production, use environment variable and rotate regularly)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_EXPIRES_IN = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 3600; // 7 days
const SESSION_EXPIRES_IN = 24 * 3600; // 24 hours

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split(":");
  const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hashToVerify === storedHash;
}

export function generateJWT(payload: Omit<JWTPayload, "iat" | "exp">): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRES_IN,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as JWTPayload;

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(userId: string, sessionId: string, ipAddress?: string, userAgent?: string): RefreshToken {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + REFRESH_TOKEN_EXPIRES_IN);

  const refreshToken: RefreshToken = {
    token,
    userId,
    sessionId,
    expiresAt,
    createdAt: new Date(),
    revoked: false,
    ipAddress,
    userAgent,
  };

  refreshTokens.set(token, refreshToken);
  return refreshToken;
}

export function verifyRefreshToken(token: string): RefreshToken | null {
  const refreshToken = refreshTokens.get(token);
  if (!refreshToken) return null;
  if (refreshToken.revoked) return null;
  if (refreshToken.expiresAt < new Date()) return null;
  return refreshToken;
}

export function revokeRefreshToken(token: string): void {
  const refreshToken = refreshTokens.get(token);
  if (refreshToken) {
    refreshToken.revoked = true;
  }
}

export function rotateRefreshToken(oldToken: string, userId: string, sessionId: string, ipAddress?: string, userAgent?: string): RefreshToken {
  // Revoke old token
  revokeRefreshToken(oldToken);

  // Generate new token
  return generateRefreshToken(userId, sessionId, ipAddress, userAgent);
}

export function createSession(userId: string, ipAddress: string, userAgent: string): Session {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + SESSION_EXPIRES_IN);

  const session: Session = {
    id: sessionId,
    userId,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    expiresAt,
    lastActivityAt: new Date(),
    revoked: false,
  };

  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.revoked) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

export function updateSessionActivity(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivityAt = new Date();
  }
}

export function revokeSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.revoked = true;
  }
}

export function revokeAllUserSessions(userId: string): void {
  for (const session of sessions.values()) {
    if (session.userId === userId && !session.revoked) {
      session.revoked = true;
    }
  }
}

// IP-based access control
export function checkIPWhitelist(user: User, ipAddress: string): boolean {
  if (!user.ipWhitelist || user.ipWhitelist.length === 0) {
    return true; // No whitelist means all IPs allowed
  }
  return user.ipWhitelist.includes(ipAddress);
}

// Role-based access control
export function hasPermission(userRole: string, requiredRole: string | string[]): boolean {
  const roleHierarchy: Record<string, number> = {
    user: 1,
    moderator: 2,
    admin: 3,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  return requiredRoles.some((role) => {
    const requiredLevel = roleHierarchy[role] || 0;
    return userLevel >= requiredLevel;
  });
}

// User management (simplified - replace with database in production)
export async function createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
  const user: User = {
    ...userData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  users.set(user.id, user);
  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  return users.get(userId) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const user = users.get(userId);
  if (!user) return null;
  
  const updated = { ...user, ...updates, updatedAt: new Date() };
  users.set(userId, updated);
  return updated;
}

export async function deleteUser(userId: string): Promise<boolean> {
  return users.delete(userId);
}

