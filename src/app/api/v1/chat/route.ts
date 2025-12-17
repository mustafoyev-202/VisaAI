import { NextRequest } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import { withCache } from "@/lib/cache/middleware";
import { semanticCacheInstance } from "@/lib/cache/semantic";
import type { RequestContext } from "@/lib/api/types";

const bodySchema = z.object({
  question: z.string().min(1, "Please provide a question."),
  language: z.string().optional(),
  context: z
    .object({
      nationality: z.string().optional(),
      destination: z.string().optional(),
      visaType: z.string().optional(),
      documentsUploaded: z.array(z.string()).optional(),
      missingDocuments: z.array(z.string()).optional(),
      riskLevel: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      return withCache(
        req,
        async () => {
          try {
            const json = await req.json().catch(() => ({}));
            const parsed = bodySchema.safeParse(json);

            if (!parsed.success) {
              return createErrorResponse(
                "VALIDATION_ERROR",
                "Invalid input data",
                400,
                { validation: parsed.error.flatten() },
                context.requestId,
                "/api/v1/docs#validation-errors",
              );
            }

            const { question, language, context: userContext } = parsed.data;

            // Check semantic cache first
            const semanticResult = await semanticCacheInstance.searchSimilar(question, 0.95);
            if (semanticResult.cached && semanticResult.response) {
              return createSuccessResponse(
                {
                  answer: semanticResult.response.response,
                  question,
                  timestamp: new Date().toISOString(),
                  cached: true,
                  similarity: semanticResult.similarity,
                },
                undefined,
                200,
              );
            }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const profilePart = userContext
              ? `
      CURRENT USER CONTEXT:
      - Nationality: ${userContext.nationality || "Unknown"}
      - Target Country: ${userContext.destination || "Unknown"}
      - Visa type: ${userContext.visaType || "Unknown"}
      - Documents they HAVE: ${userContext.documentsUploaded?.join(", ") || "None"}
      - Documents MISSING: ${userContext.missingDocuments?.join(", ") || "None"}
      - Risk level: ${userContext.riskLevel || "Not computed"}
      `
              : "";

            const prompt = [
              "You are 'Visa Copilot', an expert immigration assistant.",
              profilePart,
              "Rules:",
              "1. If they ask about documents, mention missingDocuments first.",
              "2. Keep answers calm, short, and non-legal.",
              "3. Never guarantee visa approval.",
              language
                ? `Answer in ${language} with clear, simple sentences.`
                : "Answer in clear English.",
              "",
              "User question:",
              question,
            ].join("\n");

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            // Cache response semantically
            await semanticCacheInstance.cacheResponse(question, text, 3600);

            return createSuccessResponse(
              {
                answer: text,
                question,
                timestamp: new Date().toISOString(),
                cached: false,
              },
              undefined,
              200,
            );
          } catch (error) {
            console.error(`Error in chat [${context.requestId}]:`, error);
            return createErrorResponse(
              "INTERNAL_SERVER_ERROR",
              "Failed to process chat message",
              500,
              process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
              context.requestId,
              "/api/v1/docs#errors",
            );
          }
        },
        {
          ttl: 3600, // 1 hour
          useSemanticCache: true,
          semanticThreshold: 0.95,
        },
      );
    },
    {
      rateLimitTier: "chat",
      enableCompression: true,
      enableCORS: true,
    },
  );
}

