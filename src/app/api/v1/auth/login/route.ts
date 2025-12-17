import { NextRequest } from "next/server";
import { z } from "zod";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { getUserByEmail, verifyPassword, createSession, generateJWT, generateRefreshToken, checkIPWhitelist, updateUser } from "@/lib/security/auth";
import { verifyTOTP } from "@/lib/security/mfa";
import { logAudit } from "@/lib/security/audit";
import { encryptPII } from "@/lib/security/encryption";
import type { RequestContext } from "@/lib/api/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const json = await req.json();
        const parsed = loginSchema.safeParse(json);

        if (!parsed.success) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "Invalid login data",
            400,
            { validation: parsed.error.flatten() },
            context.requestId,
          );
        }

        const { email, password, totpCode } = parsed.data;
        const ipAddress = context.ip || "unknown";

        // Get user
        const user = await getUserByEmail(email);
        if (!user || !user.passwordHash) {
          await logAudit({
            action: "login_failed",
            resource: "auth",
            ipAddress,
            userAgent: context.userAgent,
            metadata: { email },
            timestamp: new Date(),
            success: false,
            error: "Invalid credentials",
          });

          return createErrorResponse(
            "UNAUTHORIZED",
            "Invalid email or password",
            401,
            {},
            context.requestId,
          );
        }

        // Verify password
        if (!verifyPassword(password, user.passwordHash)) {
          await logAudit({
            userId: user.id,
            action: "login_failed",
            resource: "auth",
            ipAddress,
            userAgent: context.userAgent,
            timestamp: new Date(),
            success: false,
            error: "Invalid password",
          });

          return createErrorResponse(
            "UNAUTHORIZED",
            "Invalid email or password",
            401,
            {},
            context.requestId,
          );
        }

        // Check IP whitelist
        if (!checkIPWhitelist(user, ipAddress)) {
          await logAudit({
            userId: user.id,
            action: "login_blocked",
            resource: "auth",
            ipAddress,
            userAgent: context.userAgent,
            timestamp: new Date(),
            success: false,
            error: "IP not whitelisted",
          });

          return createErrorResponse(
            "FORBIDDEN",
            "Access denied from this IP address",
            403,
            {},
            context.requestId,
          );
        }

        // Verify MFA if enabled
        if (user.mfaEnabled) {
          if (!totpCode) {
            return createErrorResponse(
              "MFA_REQUIRED",
              "MFA code required",
              401,
              {},
              context.requestId,
            );
          }

          if (!user.mfaSecret || !verifyTOTP(user.mfaSecret, totpCode)) {
            await logAudit({
              userId: user.id,
              action: "mfa_failed",
              resource: "auth",
              ipAddress,
              userAgent: context.userAgent,
              timestamp: new Date(),
              success: false,
              error: "Invalid MFA code",
            });

            return createErrorResponse(
              "UNAUTHORIZED",
              "Invalid MFA code",
              401,
              {},
              context.requestId,
            );
          }
        }

        // Update last login
        await updateUser(user.id, { lastLoginAt: new Date() });

        // Create session
        const session = createSession(user.id, ipAddress, context.userAgent || "unknown");

        // Generate tokens
        const accessToken = generateJWT({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        });

        const refreshToken = generateRefreshToken(user.id, session.id, ipAddress, context.userAgent);

        await logAudit({
          userId: user.id,
          action: "login_success",
          resource: "auth",
          ipAddress,
          userAgent: context.userAgent,
          timestamp: new Date(),
          success: true,
        });

        const encryptedUser = encryptPII({ ...user });

        return createSuccessResponse(
          {
            user: {
              id: encryptedUser.id,
              email: encryptedUser.email,
              name: encryptedUser.name,
              emailVerified: encryptedUser.emailVerified,
              mfaEnabled: encryptedUser.mfaEnabled,
            },
            accessToken,
            refreshToken: refreshToken.token,
            expiresIn: 3600,
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in login [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to login",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
        );
      }
    },
    {
      enableCORS: true,
    },
  );
}

