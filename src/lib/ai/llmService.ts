// LLM Service with Fallback Logic

import type { LLMProvider, LLMConfig, LLMResponse } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";
import { trackMetrics } from "./monitoring";

export class LLMService {
  private providers: Map<string, LLMProvider>;
  private fallbackOrder: string[];

  constructor() {
    this.providers = new Map();

    // Initialize providers
    if (process.env.GEMINI_API_KEY) {
      const gemini = new GeminiProvider();
      this.providers.set("gemini", gemini);
    }

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAIProvider();
      this.providers.set("openai", openai);
    }

    // Set fallback order (prefer Gemini, fallback to OpenAI)
    this.fallbackOrder = ["gemini", "openai"].filter((name) =>
      this.providers.has(name),
    );
  }

  async generateWithFallback(
    prompt: string,
    config?: LLMConfig,
    requestId?: string,
  ): Promise<LLMResponse> {
    const errors: Array<{ provider: string; error: Error }> = [];

    for (const providerName of this.fallbackOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const startTime = Date.now();
        const response = await provider.generateCompletion(prompt, config);
        const latency = Date.now() - startTime;

        // Track metrics
        if (requestId) {
          await trackMetrics({
            requestId,
            provider: providerName,
            model: response.model || providerName,
            promptTokens: response.usage?.promptTokens || 0,
            completionTokens: response.usage?.completionTokens || 0,
            totalTokens: response.usage?.totalTokens || 0,
            latency,
            timestamp: new Date(),
            success: true,
          });
        }

        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ provider: providerName, error: err });

        console.error(`Provider ${providerName} failed:`, err);

        // Track failure metrics
        if (requestId) {
          await trackMetrics({
            requestId,
            provider: providerName,
            model: config?.model || providerName,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latency: 0,
            timestamp: new Date(),
            success: false,
            error: err.message,
          });
        }

        // Try next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(
      `All LLM providers failed. Errors: ${errors.map((e) => `${e.provider}: ${e.error.message}`).join(", ")}`,
    );
  }

  async *streamWithFallback(
    prompt: string,
    config?: LLMConfig,
  ): AsyncIterable<string> {
    for (const providerName of this.fallbackOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        yield* provider.streamCompletion(prompt, config);
        return; // Success, exit
      } catch (error) {
        console.error(`Provider ${providerName} failed:`, error);
        continue; // Try next provider
      }
    }

    throw new Error("All LLM providers failed for streaming");
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async checkProviderHealth(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) return false;
    return provider.isAvailable();
  }
}

// Singleton instance
export const llmService = new LLMService();

