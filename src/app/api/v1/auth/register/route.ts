import { NextRequest } from "next/server";
import { z } from "zod";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { createUser, getUserByEmail, hashPassword } from "@/lib/security/auth";
import { createSession, generateJWT, generateRefreshToken } from "@/lib/security/auth";
import { logAudit } from "@/lib/security/audit";
import { encryptPII } from "@/lib/security/encryption";
import type { RequestContext } from "@/lib/api/types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  consentGiven: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const json = await req.json();
        const parsed = registerSchema.safeParse(json);

        if (!parsed.success) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "Invalid registration data",
            400,
            { validation: parsed.error.flatten() },
            context.requestId,
          );
        }

        const { email, password, name, consentGiven } = parsed.data;

        // Check if user already exists
        const existing = await getUserByEmail(email);
        if (existing) {
          return createErrorResponse(
            "CONFLICT",
            "User already exists",
            409,
            {},
            context.requestId,
          );
        }

        // Create user
        const passwordHash = hashPassword(password);
        const user = await createUser({
          email,
          passwordHash,
          name,
          emailVerified: false,
          mfaEnabled: false,
          phoneVerified: false,
          role: "user",
          consentGiven,
          consentDate: consentGiven ? new Date() : undefined,
        });

        // Encrypt PII
        const encryptedUser = encryptPII({ ...user });

        // Create session
        const session = createSession(user.id, context.ip || "unknown", context.userAgent || "unknown");

        // Generate tokens
        const accessToken = generateJWT({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        });

        const refreshToken = generateRefreshToken(user.id, session.id, context.ip, context.userAgent);

        await logAudit({
          userId: user.id,
          action: "user_registered",
          resource: "user",
          resourceId: user.id,
          ipAddress: context.ip,
          userAgent: context.userAgent,
          timestamp: new Date(),
          success: true,
        });

        return createSuccessResponse(
          {
            user: {
              id: encryptedUser.id,
              email: encryptedUser.email,
              name: encryptedUser.name,
              emailVerified: encryptedUser.emailVerified,
            },
            accessToken,
            refreshToken: refreshToken.token,
            expiresIn: 3600,
          },
          undefined,
          201,
        );
      } catch (error) {
        console.error(`Error in registration [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to register user",
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

