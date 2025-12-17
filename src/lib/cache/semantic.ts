// Semantic Caching for AI Responses

import crypto from "crypto";
import type { CachedResponse, SemanticCacheResult } from "./types";
import { GoogleGenerativeAI } from "@google/generative-ai";

// In-memory semantic cache (replace with vector database in production)
const semanticCache = new Map<string, CachedResponse>();
const embeddings = new Map<string, number[]>();

// Embedding model (using Gemini embeddings)
let embeddingModel: any = null;

function initializeEmbeddingModel() {
  if (!embeddingModel && process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Note: Gemini doesn't have a direct embedding API, so we'll use a workaround
    // In production, use a proper embedding model (OpenAI, Cohere, etc.)
    embeddingModel = genAI;
  }
}

// Simple embedding function (mock - replace with actual embedding model)
async function getEmbedding(text: string): Promise<number[]> {
  // In production, use actual embedding model:
  // const response = await embeddingModel.embedQuery(text);
  // return response;
  
  // Mock embedding for MVP (simple hash-based)
  const hash = crypto.createHash("sha256").update(text.toLowerCase()).digest();
  const embedding = new Array(384).fill(0);
  for (let i = 0; i < Math.min(hash.length, embedding.length); i++) {
    embedding[i] = hash[i] / 255;
  }
  return embedding;
}

// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export class SemanticCache {
  private threshold: number;
  private defaultTTL: number;

  constructor(threshold: number = 0.95, defaultTTL: number = 3600) {
    this.threshold = threshold;
    this.defaultTTL = defaultTTL;
    initializeEmbeddingModel();
  }

  async getSimilarResponse(query: string): Promise<CachedResponse | null> {
    const queryEmbedding = await getEmbedding(query);

    let bestMatch: { id: string; similarity: number } | null = null;

    // Search for similar embeddings
    for (const [id, cachedEmbedding] of embeddings.entries()) {
      const similarity = cosineSimilarity(queryEmbedding, cachedEmbedding);
      
      if (similarity >= this.threshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { id, similarity };
        }
      }
    }

    if (bestMatch) {
      const cached = semanticCache.get(bestMatch.id);
      if (cached && cached.expiresAt > Date.now()) {
        return cached;
      } else if (cached) {
        // Expired, remove it
        semanticCache.delete(bestMatch.id);
        embeddings.delete(bestMatch.id);
      }
    }

    return null;
  }

  async cacheResponse(
    query: string,
    response: string,
    ttl?: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const id = crypto.randomUUID();
    const embedding = await getEmbedding(query);
    const expiresAt = Date.now() + (ttl || this.defaultTTL) * 1000;

    const cached: CachedResponse = {
      id,
      query,
      response,
      embedding,
      timestamp: Date.now(),
      expiresAt,
      metadata,
    };

    semanticCache.set(id, cached);
    embeddings.set(id, embedding);

    // Clean up expired entries periodically
    this.cleanup();
  }

  async getCachedResponse(id: string): Promise<CachedResponse | null> {
    const cached = semanticCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
    if (cached) {
      semanticCache.delete(id);
      embeddings.delete(id);
    }
    return null;
  }

  async searchSimilar(
    query: string,
    threshold?: number,
  ): Promise<SemanticCacheResult> {
    const queryEmbedding = await getEmbedding(query);
    const searchThreshold = threshold || this.threshold;

    let bestMatch: { id: string; similarity: number } | null = null;

    for (const [id, cachedEmbedding] of embeddings.entries()) {
      const similarity = cosineSimilarity(queryEmbedding, cachedEmbedding);
      
      if (similarity >= searchThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { id, similarity };
        }
      }
    }

    if (bestMatch) {
      const cached = await this.getCachedResponse(bestMatch.id);
      if (cached) {
        return {
          cached: true,
          response: cached,
          similarity: bestMatch.similarity,
        };
      }
    }

    return { cached: false };
  }

  private cleanup(): void {
    // Clean up expired entries (run periodically, not on every cache)
    if (Math.random() < 0.1) { // 10% chance to cleanup
      const now = Date.now();
      for (const [id, cached] of semanticCache.entries()) {
        if (cached.expiresAt < now) {
          semanticCache.delete(id);
          embeddings.delete(id);
        }
      }
    }
  }

  clear(): void {
    semanticCache.clear();
    embeddings.clear();
  }

  size(): number {
    return semanticCache.size;
  }
}

// Singleton instance
export const semanticCacheInstance = new SemanticCache();

