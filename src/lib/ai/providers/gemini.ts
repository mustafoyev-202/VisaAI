// Google Gemini Provider

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseLLMProvider } from "./base";
import type { LLMConfig, LLMResponse } from "../types";

export class GeminiProvider extends BaseLLMProvider {
  name = "gemini";
  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey?: string, model: string = "gemini-2.5-flash") {
    super();
    this.client = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || "");
    this.defaultModel = model;
  }

  async generateCompletion(
    prompt: string,
    config?: LLMConfig,
  ): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: config?.model || this.defaultModel,
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        topP: config?.topP,
        topK: config?.topK,
        maxOutputTokens: config?.maxTokens,
        stopSequences: config?.stopSequences,
      },
    });

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const latency = Date.now() - startTime;

    const response = result.response;
    const text = response.text();

    // Estimate token usage (Gemini doesn't always provide this)
    const estimatedPromptTokens = Math.ceil(prompt.length / 4);
    const estimatedCompletionTokens = Math.ceil(text.length / 4);

    return this.createResponse(
      text,
      {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
      },
      config?.model || this.defaultModel,
      response.candidates?.[0]?.finishReason,
      {
        latency,
        candidateCount: response.candidates?.length || 0,
      },
    );
  }

  async *streamCompletion(
    prompt: string,
    config?: LLMConfig,
  ): AsyncIterable<string> {
    const model = this.client.getGenerativeModel({
      model: config?.model || this.defaultModel,
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        topP: config?.topP,
        topK: config?.topK,
        maxOutputTokens: config?.maxTokens,
      },
    });

    const stream = await model.generateContentStream(prompt);

    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}

