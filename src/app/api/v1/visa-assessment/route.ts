import { NextRequest } from "next/server";
import { z } from "zod";
import { retrieveRelevantRules, type VisaProfile } from "@/lib/rag";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withMiddleware, createSuccessResponse, createErrorResponse } from "@/lib/api/middleware";
import type { RequestContext } from "@/lib/api/types";

const profileSchema = z.object({
  nationality: z.string().min(2),
  currentCountry: z.string().min(2),
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
  purpose: z.string().min(3),
  durationMonths: z.number().optional(),
  age: z.number().optional(),
  education: z.string().optional(),
  jobInfo: z.string().optional(),
  fundsAvailable: z.number().optional(),
  estimatedCosts: z.number().optional(),
  studyGapYears: z.number().optional(),
  priorRejection: z.boolean().optional(),
  preferredLanguage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async (req: NextRequest, context: RequestContext) => {
      try {
        const json = await req.json();
        const parsed = profileSchema.safeParse(json);

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

        const profile: VisaProfile & { preferredLanguage?: string } = parsed.data;

        const rules = await retrieveRelevantRules(profile);

        const systemPrompt = [
          "You are an AI visa and immigration copilot.",
          "You must only rely on the official-style rules provided in the context below.",
          "Use plain, friendly language. Assume the user has no legal background.",
          "Return a JSON object with the following keys:",
          " - eligibility: one of 'Likely', 'Maybe', 'Risky'",
          " - summary: short overview of the situation and main points",
          " - explanation: deeper explanation referencing key conditions",
          " - checklist: { required: string[], conditional: string[], riskyOrMissing: string[] }",
          " - risks: string[] (short bullet-style sentences)",
          "If information is missing or uncertain, say so explicitly and be conservative.",
        ].join("\n");

        const userDescription = [
          `Nationality: ${profile.nationality}`,
          `Current country: ${profile.currentCountry}`,
          `Destination country: ${profile.destinationCountry}`,
          `Visa type: ${profile.visaType}`,
          `Purpose: ${profile.purpose}`,
          profile.durationMonths
            ? `Planned stay: ${profile.durationMonths} months`
            : undefined,
          profile.age ? `Age: ${profile.age}` : undefined,
          profile.education ? `Education: ${profile.education}` : undefined,
          profile.jobInfo ? `Job info: ${profile.jobInfo}` : undefined,
          profile.fundsAvailable
            ? `Funds available (approx): ${profile.fundsAvailable}`
            : undefined,
          profile.estimatedCosts
            ? `Estimated tuition + living costs: ${profile.estimatedCosts}`
            : undefined,
          profile.studyGapYears
            ? `Study gap in years: ${profile.studyGapYears}`
            : undefined,
          typeof profile.priorRejection === "boolean"
            ? `Prior visa rejection: ${profile.priorRejection ? "yes" : "no"}`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n");

        const rulesText = rules
          .map((r) => `### ${r.title}\n${r.text}`)
          .join("\n\n");

        const languageInstruction = profile.preferredLanguage
          ? `Explain in simple terms and then translate the final answer into ${profile.preferredLanguage}.`
          : "Explain in simple, clear English at 8th-grade reading level.";

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = [
          systemPrompt,
          languageInstruction,
          "",
          `Official rules context:\n${rulesText || "No rules found."}`,
          "",
          "User visa profile:",
          userDescription,
          "",
          "Return ONLY a valid JSON object with the required keys. Do not include any extra commentary.",
        ].join("\n");

        const result = await model.generateContent(prompt);
        let text = result.response.text();

        // Gemini sometimes wraps JSON in markdown fences. Strip them defensively.
        text = text.trim();
        if (text.startsWith("```")) {
          text = text.replace(/^```[a-zA-Z]*\s*/, "");
          text = text.replace(/```$/, "");
          text = text.trim();
        }

        const parsedJson = JSON.parse(text);

        return createSuccessResponse(
          {
            profile,
            rules,
            analysis: parsedJson,
          },
          undefined,
          200,
        );
      } catch (error) {
        console.error(`Error in visa assessment [${context.requestId}]:`, error);
        return createErrorResponse(
          "INTERNAL_SERVER_ERROR",
          "Failed to process visa assessment",
          500,
          process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
          context.requestId,
          "/api/v1/docs#errors",
        );
      }
    },
    {
      rateLimitTier: "assessment",
      enableCompression: true,
      enableCORS: true,
    },
  );
}

