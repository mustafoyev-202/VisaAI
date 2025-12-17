// Vector Store Abstraction for RAG

import type { RAGContext, RAGResult } from "../types";

export interface VectorStore {
  name: string;
  addDocuments(documents: Array<{ id: string; content: string; metadata?: Record<string, any> }>): Promise<void>;
  search(query: string, options?: RAGContext): Promise<RAGResult[]>;
  deleteDocuments(ids: string[]): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// In-memory vector store (for MVP - replace with Pinecone/Weaviate/Qdrant in production)
export class InMemoryVectorStore implements VectorStore {
  name = "in-memory";
  private documents: Map<string, { content: string; embedding: number[]; metadata?: Record<string, any> }> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  // Simple embedding function (replace with actual embedding model)
  private async embed(text: string): Promise<number[]> {
    // Mock embedding - in production, use actual embedding model
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    words.forEach((word, idx) => {
      const hash = this.hashString(word);
      embedding[hash % 384] += 1 / (idx + 1);
    });
    return this.normalize(embedding);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash);
  }

  private normalize(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vec.map((val) => val / magnitude) : vec;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async addDocuments(
    documents: Array<{ id: string; content: string; metadata?: Record<string, any> }>,
  ): Promise<void> {
    for (const doc of documents) {
      const embedding = await this.embed(doc.content);
      this.documents.set(doc.id, {
        content: doc.content,
        embedding,
        metadata: doc.metadata,
      });
      this.embeddings.set(doc.id, embedding);
    }
  }

  async search(query: string, options?: RAGContext): Promise<RAGResult[]> {
    const queryEmbedding = await this.embed(query);
    const topK = options?.topK || 5;
    const minScore = options?.minScore || 0.5;

    const results: Array<{ id: string; score: number }> = [];

    for (const [id, docEmbedding] of this.embeddings.entries()) {
      const doc = this.documents.get(id);
      if (!doc) continue;

      // Apply filters
      if (options?.filters) {
        let matches = true;
        for (const [key, value] of Object.entries(options.filters)) {
          if (doc.metadata?.[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      const score = this.cosineSimilarity(queryEmbedding, docEmbedding);
      if (score >= minScore) {
        results.push({ id, score });
      }
    }

    // Sort by score and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    return topResults.map(({ id, score }) => {
      const doc = this.documents.get(id)!;
      return {
        content: doc.content,
        score,
        source: id,
        metadata: doc.metadata,
      };
    });
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
      this.embeddings.delete(id);
    }
  }

  async isAvailable(): Promise<boolean> {
    return true; // In-memory store is always available
  }
}

// Pinecone integration (commented out - uncomment when Pinecone is configured)
/*
import { Pinecone } from '@pinecone-database/pinecone';

export class PineconeVectorStore implements VectorStore {
  name = "pinecone";
  private client: Pinecone;
  private index: any;

  constructor(apiKey: string, indexName: string) {
    this.client = new Pinecone({ apiKey });
  }

  async initialize() {
    this.index = this.client.index(indexName);
  }

  async addDocuments(documents: Array<{ id: string; content: string; metadata?: Record<string, any> }>): Promise<void> {
    // Implement Pinecone upsert
  }

  async search(query: string, options?: RAGContext): Promise<RAGResult[]> {
    // Implement Pinecone query
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    // Implement Pinecone delete
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.index.describeIndexStats();
      return true;
    } catch {
      return false;
    }
  }
}
*/

