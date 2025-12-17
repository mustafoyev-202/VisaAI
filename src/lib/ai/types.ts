// AI/ML Integration Types

export interface LLMConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  model?: string;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
  metadata?: Record<string, any>;
}

export interface LLMProvider {
  name: string;
  generateCompletion(prompt: string, config?: LLMConfig): Promise<LLMResponse>;
  streamCompletion(prompt: string, config?: LLMConfig): AsyncIterable<string>;
  isAvailable(): Promise<boolean>;
}

export interface PromptTemplate {
  id: string;
  version: number;
  name: string;
  template: string;
  variables: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  testVariant?: string; // For A/B testing
  performance?: {
    avgLatency: number;
    avgQuality: number;
    totalUses: number;
    successRate: number;
  };
}

export interface PromptContext {
  userId?: string;
  sessionId?: string;
  userProfile?: Record<string, any>;
  previousMessages?: Array<{ role: string; content: string }>;
  metadata?: Record<string, any>;
}

export interface RAGContext {
  query: string;
  topK?: number;
  minScore?: number;
  filters?: Record<string, any>;
}

export interface RAGSearchOptions {
  topK?: number;
  minScore?: number;
  filters?: Record<string, any>;
}

export interface RAGResult {
  content: string;
  score: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface ModelMetrics {
  requestId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latency: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  qualityScore?: number;
  userSatisfaction?: number;
}

export interface MonitoringAlert {
  id: string;
  type: "latency" | "error_rate" | "quality" | "token_usage" | "hallucination";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved?: boolean;
}

