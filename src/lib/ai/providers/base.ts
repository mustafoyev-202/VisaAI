// Base LLM Provider Interface

import type { LLMProvider, LLMConfig, LLMResponse } from "../types";

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;

  abstract generateCompletion(
    prompt: string,
    config?: LLMConfig,
  ): Promise<LLMResponse>;

  abstract streamCompletion(
    prompt: string,
    config?: LLMConfig,
  ): AsyncIterable<string>;

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check - try a minimal completion
      await this.generateCompletion("test", { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }

  protected createResponse(
    content: string,
    usage?: LLMResponse["usage"],
    model?: string,
    finishReason?: string,
    metadata?: Record<string, any>,
  ): LLMResponse {
    return {
      content,
      usage,
      model: model || this.name,
      finishReason,
      metadata,
    };
  }
}

