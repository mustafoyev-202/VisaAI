import { NextRequest } from "next/server";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { getAuthorizationUrl, generateOAuthState, storeOAuthState } from "@/lib/security/oauth";
import type { RequestContext } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const { searchParams } = new URL(req.url);
        const provider = searchParams.get("provider");

        if (!provider || !["google", "facebook"].includes(provider)) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "Invalid provider. Supported: google, facebook",
            400,
            {},
            context.requestId,
          );
        }

        const state = generateOAuthState();
        storeOAuthState(state, provider);

        const authUrl = getAuthorizationUrl(provider, state);

        return createSuccessResponse(
          {
            authorizationUrl: authUrl,
            state,
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in OAuth [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to initiate OAuth",
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

