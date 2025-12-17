// OpenAI Provider (for fallback)

import OpenAI from "openai";
import { BaseLLMProvider } from "./base";
import type { LLMConfig, LLMResponse } from "../types";

export class OpenAIProvider extends BaseLLMProvider {
  name = "openai";
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey?: string, model: string = "gpt-3.5-turbo") {
    super();
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.defaultModel = model;
  }

  async generateCompletion(
    prompt: string,
    config?: LLMConfig,
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const completion = await this.client.chat.completions.create({
      model: config?.model || this.defaultModel,
      messages: [{ role: "user", content: prompt }],
      temperature: config?.temperature ?? 0.7,
      max_tokens: config?.maxTokens,
      top_p: config?.topP,
      stop: config?.stopSequences,
    });

    const latency = Date.now() - startTime;
    const message = completion.choices[0]?.message?.content || "";
    const usage = completion.usage;

    return this.createResponse(
      message,
      usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      config?.model || this.defaultModel,
      completion.choices[0]?.finish_reason,
      {
        latency,
        choiceCount: completion.choices.length,
      },
    );
  }

  async *streamCompletion(
    prompt: string,
    config?: LLMConfig,
  ): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: config?.model || this.defaultModel,
      messages: [{ role: "user", content: prompt }],
      temperature: config?.temperature ?? 0.7,
      max_tokens: config?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

