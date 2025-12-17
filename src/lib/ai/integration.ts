// Integration Example: How to use all AI components together

import { llmService } from "./llmService";
import { promptManager } from "./promptManager";
import { enhancedRAG } from "./rag/enhancedRAG";
import { trackMetrics, calculateQualityScore, detectHallucination } from "./monitoring";
import type { VisaProfile } from "@/lib/rag";
import type { LLMConfig } from "./types";

export interface AIGenerationOptions {
  promptId: string;
  profile: VisaProfile;
  variables?: Record<string, any>;
  config?: LLMConfig;
  requestId?: string;
  enableRAG?: boolean;
  enableMonitoring?: boolean;
}

export async function generateWithAI(options: AIGenerationOptions): Promise<{
  content: string;
  sources?: Array<{ content: string; score: number; source: string }>;
  metrics?: {
    latency: number;
    tokens: number;
    quality: number;
    hallucination?: { isHallucination: boolean; confidence: number };
  };
}> {
  const {
    promptId,
    profile,
    variables = {},
    config,
    requestId = crypto.randomUUID(),
    enableRAG = true,
    enableMonitoring = true,
  } = options;

  const startTime = Date.now();

  try {
    // 1. Get prompt template
    const promptTemplate = await promptManager.getPrompt(promptId, {
      userProfile: profile,
      metadata: variables,
    });

    // 2. Retrieve relevant context via RAG
    let ragContext = "";
    let sources: Array<{ content: string; score: number; source: string }> = [];

    if (enableRAG) {
      const ragResults = await enhancedRAG.retrieve(
        `${profile.destinationCountry} ${profile.visaType} visa requirements`,
        profile,
        { topK: 5, minScore: 0.6 },
      );

      ragContext = ragResults.map((r) => r.content).join("\n\n");
      sources = ragResults.map((r) => ({
        content: r.content,
        score: r.score,
        source: r.source,
      }));

      // Add RAG context to variables
      variables.rules = ragContext;
    }

    // 3. Build final prompt
    const finalPrompt = await promptManager.getPrompt(promptId, {
      userProfile: profile,
      metadata: {
        ...variables,
        profile: JSON.stringify(profile),
      },
    });

    // 4. Generate completion with fallback
    const response = await llmService.generateWithFallback(
      finalPrompt,
      config,
      requestId,
    );

    const latency = Date.now() - startTime;

    // 5. Quality checks
    let qualityScore = 0.5;
    let hallucinationCheck: { isHallucination: boolean; confidence: number } | undefined;

    if (enableMonitoring) {
      qualityScore = calculateQualityScore(response.content);

      if (enableRAG && sources.length > 0) {
        const contextTexts = sources.map((s) => s.content);
        hallucinationCheck = detectHallucination(response.content, contextTexts);
      }

      // Track metrics
      await trackMetrics({
        requestId,
        provider: response.model || "unknown",
        model: response.model || "unknown",
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
        latency,
        timestamp: new Date(),
        success: true,
        qualityScore,
      });

      // Update prompt performance
      await promptManager.updatePromptPerformance(
        promptId,
        latency,
        qualityScore,
        true,
      );
    }

    return {
      content: response.content,
      ...(sources.length > 0 && { sources }),
      ...(enableMonitoring && {
        metrics: {
          latency,
          tokens: response.usage?.totalTokens || 0,
          quality: qualityScore,
          ...(hallucinationCheck && { hallucination: hallucinationCheck }),
        },
      }),
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    if (enableMonitoring) {
      await trackMetrics({
        requestId,
        provider: "unknown",
        model: "unknown",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latency,
        timestamp: new Date(),
        success: false,
        error: err.message,
      });
    }

    throw err;
  }
}

// Example usage:
/*
const result = await generateWithAI({
  promptId: "visa-assessment",
  profile: {
    nationality: "Indian",
    currentCountry: "India",
    destinationCountry: "canada",
    visaType: "student",
    purpose: "Master's degree",
  },
  variables: {
    languageInstruction: "Explain in simple English",
  },
  enableRAG: true,
  enableMonitoring: true,
});

console.log(result.content);
console.log(result.sources);
console.log(result.metrics);
*/

