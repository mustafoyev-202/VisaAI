import { NextRequest } from "next/server";
import { z } from "zod";
import { retrieveRelevantRules, type VisaProfile } from "@/lib/rag";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import type { RequestContext } from "@/lib/api/types";

const eligibilitySchema = z.object({
  nationality: z.string().min(2),
  destinationCountry: z.enum([
    "canada",
    "usa",
    "uk",
    "australia",
    "germany",
    "france",
    "spain",
    "italy",
    "netherlands",
    "sweden",
    "switzerland",
    "newzealand",
    "singapore",
    "japan",
    "southkorea",
    "other",
  ]),
  visaType: z.enum(["student", "tourist", "work", "business", "family", "permanent", "other"]),
});

export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const { searchParams } = new URL(req.url);
        const nationality = searchParams.get("nationality");
        const destinationCountry = searchParams.get("destinationCountry");
        const visaType = searchParams.get("visaType");

        if (!nationality || !destinationCountry || !visaType) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "Missing required query parameters: nationality, destinationCountry, visaType",
            400,
            {},
            context.requestId,
            "/api/v1/docs#eligibility",
          );
        }

        const parsed = eligibilitySchema.safeParse({
          nationality,
          destinationCountry: destinationCountry as any,
          visaType: visaType as any,
        });

        if (!parsed.success) {
          return createErrorResponse(
            "VALIDATION_ERROR",
            "Invalid query parameters",
            400,
            { validation: parsed.error.flatten() },
            context.requestId,
            "/api/v1/docs#eligibility",
          );
        }

        const profile: VisaProfile = {
          ...parsed.data,
          currentCountry: parsed.data.nationality, // Default to nationality if not provided
          purpose: "Eligibility check",
        };

        const rules = await retrieveRelevantRules(profile);

        // Simple eligibility check based on rules
        const hasRelevantRules = rules.length > 0;
        const eligibility = hasRelevantRules ? "Likely" : "Unknown";

        return createSuccessResponse(
          {
            eligibility,
            nationality: parsed.data.nationality,
            destinationCountry: parsed.data.destinationCountry,
            visaType: parsed.data.visaType,
            relevantRulesFound: rules.length,
            checkedAt: new Date().toISOString(),
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in eligibility check [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to check eligibility",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
          "/api/v1/docs#errors",
        );
      }
    },
    {
      rateLimitTier: "default",
      cacheMaxAge: 3600, // Cache for 1 hour
      enableCompression: true,
      enableCORS: true,
    },
  );
}

