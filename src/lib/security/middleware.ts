// Security Middleware

import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, getSession, updateSessionActivity } from "./auth";
import { logAudit } from "./audit";
import { createRequestContext } from "@/lib/api/response";
import type { RequestContext } from "@/lib/api/types";

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export async function requireAuth(
  request: NextRequest,
): Promise<{ user: AuthContext; context: RequestContext } | NextResponse> {
  const context = createRequestContext(request);
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await logAudit({
      action: "unauthorized_access",
      resource: request.url,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date(),
      success: false,
      error: "Missing authorization header",
    });

    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  const payload = verifyJWT(token);

  if (!payload) {
    await logAudit({
      action: "invalid_token",
      resource: request.url,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date(),
      success: false,
      error: "Invalid or expired token",
    });

    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } },
      { status: 401 },
    );
  }

  // Verify session
  const session = getSession(payload.sessionId);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Session expired" } },
      { status: 401 },
    );
  }

  // Update session activity
  updateSessionActivity(payload.sessionId);

  return {
    user: {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    },
    context,
  };
}

export async function requireRole(
  request: NextRequest,
  requiredRole: string | string[],
): Promise<{ user: AuthContext; context: RequestContext } | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!roles.includes(user.role)) {
    await logAudit({
      userId: user.userId,
      action: "insufficient_permissions",
      resource: request.url,
      ipAddress: authResult.context.ip,
      userAgent: authResult.context.userAgent,
      metadata: { requiredRole: roles, userRole: user.role },
      timestamp: new Date(),
      success: false,
      error: "Insufficient permissions",
    });

    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
      { status: 403 },
    );
  }

  return authResult;
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
  );

  // Strict Transport Security
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // X-Content-Type-Options
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-Frame-Options
  response.headers.set("X-Frame-Options", "DENY");

  // X-XSS-Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  );

  return response;
}

// CORS policy
export function addCORSPolicy(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
  const allowOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins.length > 0
        ? allowedOrigins[0]
        : "*";

  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

// TLS enforcement (check in production)
export function enforceTLS(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    return protocol === "https";
  }
  return true; // Allow HTTP in development
}

