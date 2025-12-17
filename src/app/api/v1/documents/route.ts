import { NextRequest } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import type { RequestContext } from "@/lib/api/types";

const documentSchema = z.object({
  name: z.string(),
  typeHint: z.string().optional(),
  textContent: z.string().min(10),
});

const requestSchema = z.object({
  destinationCountry: z.enum(["canada", "usa", "uk", "australia", "germany", "france", "spain", "italy", "netherlands", "sweden", "switzerland", "newzealand", "singapore", "japan", "southkorea", "other"]),
  visaType: z.enum(["student", "tourist", "work", "business", "family", "permanent", "other"]),
  documents: z.array(documentSchema),
});

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const json = await req.json();
        const parsed = requestSchema.safeParse(json);

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

        const { destinationCountry, visaType, documents } = parsed.data;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = [
          "You are helping review visa application documents.",
          "Classify each document, check for basic completeness, and flag obvious risks.",
          "Return a JSON array of objects with:",
          " - name: string",
          " - inferredType: string",
          " - issues: string[] (missing pages, expired dates, low funds, unclear identity, etc.)",
          " - suggestions: string[] (what the applicant should fix or add).",
          "Be cautious and explain that this is a preliminary, AI-only review.",
          "",
          "Documents JSON:",
          JSON.stringify({ destinationCountry, visaType, documents }),
          "",
          "Return ONLY the JSON array. Do not include explanations outside the JSON.",
        ].join("\n");

        const result = await model.generateContent(prompt);
        let text = result.response.text();

        // Strip markdown code fences if present
        text = text.trim();
        if (text.startsWith("```")) {
          text = text.replace(/^```[a-zA-Z]*\s*/, "");
          text = text.replace(/```$/, "");
          text = text.trim();
        }

        const parsedJson = JSON.parse(text);

        return createSuccessResponse(
          {
            documents: parsedJson,
            analyzedAt: new Date().toISOString(),
            totalDocuments: documents.length,
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in document analysis [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to analyze documents",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
          "/api/v1/docs#errors",
        );
      }
    },
    {
      rateLimitTier: "heavy",
      enableCompression: true,
      enableCORS: true,
    },
  );
}

