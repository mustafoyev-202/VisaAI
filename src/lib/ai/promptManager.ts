// Prompt Management System

import type { PromptTemplate, PromptContext } from "./types";
import { trackMetrics } from "./monitoring";

// In-memory prompt store (replace with database in production)
const promptStore = new Map<string, PromptTemplate[]>();

// Default prompt templates
const defaultPrompts: PromptTemplate[] = [
  {
    id: "visa-assessment",
    version: 1,
    name: "Visa Assessment",
    template: `You are an AI visa and immigration copilot.
You must only rely on the official-style rules provided in the context below.
Use plain, friendly language. Assume the user has no legal background.

Return a JSON object with the following keys:
- eligibility: one of 'Likely', 'Maybe', 'Risky'
- summary: short overview of the situation and main points
- explanation: deeper explanation referencing key conditions
- checklist: { required: string[], conditional: string[], riskyOrMissing: string[] }
- risks: string[] (short bullet-style sentences)

Official rules context:
{{rules}}

User visa profile:
{{profile}}

{{languageInstruction}}

Return ONLY a valid JSON object with the required keys. Do not include any extra commentary.`,
    variables: ["rules", "profile", "languageInstruction"],
    description: "Main visa assessment prompt",
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    performance: {
      avgLatency: 0,
      avgQuality: 0,
      totalUses: 0,
      successRate: 1.0,
    },
  },
  {
    id: "visa-chat",
    version: 1,
    name: "Visa Chat Assistant",
    template: `You are 'Visa Copilot', an expert immigration assistant.

{{#if context}}
CURRENT USER CONTEXT:
- Nationality: {{context.nationality}}
- Target Country: {{context.destination}}
- Visa type: {{context.visaType}}
- Documents they HAVE: {{context.documentsUploaded}}
- Documents MISSING: {{context.missingDocuments}}
- Risk level: {{context.riskLevel}}
{{/if}}

Rules:
1. If they ask about documents, mention missingDocuments first.
2. Keep answers calm, short, and non-legal.
3. Never guarantee visa approval.

{{#if language}}
Answer in {{language}} with clear, simple sentences.
{{else}}
Answer in clear English.
{{/if}}

User question: {{question}}`,
    variables: ["context", "language", "question"],
    description: "Chat assistant prompt",
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    performance: {
      avgLatency: 0,
      avgQuality: 0,
      totalUses: 0,
      successRate: 1.0,
    },
  },
];

// Initialize default prompts
defaultPrompts.forEach((prompt) => {
  if (!promptStore.has(prompt.id)) {
    promptStore.set(prompt.id, []);
  }
  promptStore.get(prompt.id)!.push(prompt);
});

export class PromptManager {
  // Simple template interpolation (replace with Handlebars/Mustache in production)
  private interpolate(template: string, variables: Record<string, any>): string {
    let result = template;

    // Handle conditional blocks {{#if variable}}...{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
      return variables[varName] ? content : "";
    });

    // Handle variable interpolation {{variable}} or {{object.property}}
    result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varPath) => {
      const parts = varPath.split(".");
      let value = variables;
      for (const part of parts) {
        value = value?.[part];
      }
      return value !== undefined && value !== null ? String(value) : "";
    });

    // Handle array join {{array.join}}
    result = result.replace(/\{\{(\w+)\.join\}\}/g, (match, varName) => {
      const arr = variables[varName];
      return Array.isArray(arr) ? arr.join(", ") : "";
    });

    return result;
  }

  async getPrompt(
    promptId: string,
    context?: PromptContext,
  ): Promise<string> {
    const versions = promptStore.get(promptId);
    if (!versions || versions.length === 0) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    // Get active prompt (or latest version)
    const prompt = versions.find((p) => p.isActive) || versions[versions.length - 1];

    // A/B testing: select variant if available
    let selectedPrompt = prompt;
    if (prompt.testVariant && context?.sessionId) {
      // Simple hash-based A/B selection (50/50 split)
      const hash = this.hashString(context.sessionId + promptId);
      const variant = promptStore.get(`${promptId}-variant-${prompt.testVariant}`);
      if (variant && hash % 2 === 0) {
        selectedPrompt = variant[0];
      }
    }

    // Interpolate variables
    const variables: Record<string, any> = {
      ...context?.userProfile,
      ...context?.metadata,
    };

    return this.interpolate(selectedPrompt.template, variables);
  }

  async createPrompt(prompt: Omit<PromptTemplate, "createdAt" | "updatedAt">): Promise<PromptTemplate> {
    const newPrompt: PromptTemplate = {
      ...prompt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!promptStore.has(prompt.id)) {
      promptStore.set(prompt.id, []);
    }

    promptStore.get(prompt.id)!.push(newPrompt);
    return newPrompt;
  }

  async updatePromptPerformance(
    promptId: string,
    latency: number,
    quality?: number,
    success: boolean = true,
  ): Promise<void> {
    const versions = promptStore.get(promptId);
    if (!versions) return;

    versions.forEach((prompt) => {
      if (!prompt.performance) {
        prompt.performance = {
          avgLatency: 0,
          avgQuality: 0,
          totalUses: 0,
          successRate: 1.0,
        };
      }

      const perf = prompt.performance;
      perf.totalUses += 1;
      perf.avgLatency = (perf.avgLatency * (perf.totalUses - 1) + latency) / perf.totalUses;

      if (quality !== undefined) {
        perf.avgQuality = (perf.avgQuality * (perf.totalUses - 1) + quality) / perf.totalUses;
      }

      if (!success) {
        perf.successRate = (perf.successRate * (perf.totalUses - 1)) / perf.totalUses;
      }
    });
  }

  async getPromptPerformance(promptId: string): Promise<PromptTemplate["performance"]> {
    const versions = promptStore.get(promptId);
    if (!versions || versions.length === 0) return undefined;

    const active = versions.find((p) => p.isActive) || versions[versions.length - 1];
    return active.performance;
  }

  // Simple hash function for A/B testing
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Cache for common queries
  private promptCache = new Map<string, { prompt: string; expires: number }>();
  private cacheTTL = 3600000; // 1 hour

  async getCachedPrompt(
    promptId: string,
    cacheKey: string,
  ): Promise<string | null> {
    const cached = this.promptCache.get(`${promptId}:${cacheKey}`);
    if (cached && cached.expires > Date.now()) {
      return cached.prompt;
    }
    return null;
  }

  async cachePrompt(
    promptId: string,
    cacheKey: string,
    prompt: string,
  ): Promise<void> {
    this.promptCache.set(`${promptId}:${cacheKey}`, {
      prompt,
      expires: Date.now() + this.cacheTTL,
    });
  }
}

export const promptManager = new PromptManager();

