import { NextRequest } from "next/server";
import { z } from "zod";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { verifyRefreshToken, rotateRefreshToken, getUserById, generateJWT } from "@/lib/security/auth";
import { logAudit } from "@/lib/security/audit";
import type { RequestContext } from "@/lib/api/types";

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const json = await req.json();
        const parsed = refreshSchema.safeParse(json);

        if (!parsed.success) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "Invalid refresh token",
            400,
            {},
            context.requestId,
          );
        }

        const { refreshToken } = parsed.data;

        // Verify refresh token
        const tokenData = verifyRefreshToken(refreshToken);
        if (!tokenData) {
          return createErrorResponse(
            "UNAUTHORIZED",
            "Invalid or expired refresh token",
            401,
            {},
            context.requestId,
          );
        }

        // Get user
        const user = await getUserById(tokenData.userId);
        if (!user) {
          return createErrorResponse(
            "NOT_FOUND",
            "User not found",
            404,
            {},
            context.requestId,
          );
        }

        // Rotate refresh token
        const newRefreshToken = rotateRefreshToken(
          refreshToken,
          user.id,
          tokenData.sessionId,
          context.ip,
          context.userAgent,
        );

        // Generate new access token
        const accessToken = generateJWT({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: tokenData.sessionId,
        });

        await logAudit({
          userId: user.id,
          action: "token_refreshed",
          resource: "auth",
          ipAddress: context.ip,
          userAgent: context.userAgent,
          timestamp: new Date(),
          success: true,
        });

        return createSuccessResponse(
          {
            accessToken,
            refreshToken: newRefreshToken.token,
            expiresIn: 3600,
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in token refresh [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to refresh token",
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

