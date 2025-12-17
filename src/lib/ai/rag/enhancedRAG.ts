// Enhanced RAG Implementation

import { InMemoryVectorStore, type VectorStore } from "./vectorStore";
import type { RAGSearchOptions, RAGResult } from "../types";
import { retrieveRelevantRules } from "@/lib/rag";
import type { VisaProfile } from "@/lib/rag";

export class EnhancedRAG {
  private vectorStore: VectorStore;
  private cache: Map<string, { results: RAGResult[]; expires: number }> = new Map();
  private cacheTTL = 3600000; // 1 hour

  constructor(vectorStore?: VectorStore) {
    this.vectorStore = vectorStore || new InMemoryVectorStore();
  }

  async retrieve(
    query: string,
    profile: VisaProfile,
    options?: RAGSearchOptions,
  ): Promise<RAGResult[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(query, profile);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.results;
    }

    // Use existing RAG logic as fallback
    const rules = await retrieveRelevantRules(profile);

    // Convert rules to vector store format if not already indexed
    if (this.vectorStore instanceof InMemoryVectorStore) {
      const documents = rules.map((rule, idx) => ({
        id: `rule-${idx}`,
        content: `${rule.title}\n${rule.text}`,
        metadata: {
          country: profile.destinationCountry,
          visaType: profile.visaType,
          title: rule.title,
        },
      }));

      await this.vectorStore.addDocuments(documents);
    }

    // Perform semantic search
    const results = await this.vectorStore.search(query, {
      ...options,
      filters: {
        country: profile.destinationCountry,
        visaType: profile.visaType,
        ...options?.filters,
      },
    });

    // Rank and filter results
    const rankedResults = this.rankResults(results, query, profile);

    // Cache results
    this.cache.set(cacheKey, {
      results: rankedResults,
      expires: Date.now() + this.cacheTTL,
    });

    return rankedResults;
  }

  private rankResults(
    results: RAGResult[],
    query: string,
    profile: VisaProfile,
  ): RAGResult[] {
    return results
      .map((result) => {
        let score = result.score;

        // Boost score if metadata matches profile
        if (result.metadata?.country === profile.destinationCountry) {
          score *= 1.2;
        }
        if (result.metadata?.visaType === profile.visaType) {
          score *= 1.2;
        }

        // Boost score if query terms appear in content
        const queryTerms = query.toLowerCase().split(/\s+/);
        const contentLower = result.content.toLowerCase();
        const termMatches = queryTerms.filter((term) => contentLower.includes(term)).length;
        score *= 1 + termMatches * 0.1;

        return { ...result, score: Math.min(1.0, score) };
      })
      .sort((a, b) => b.score - a.score);
  }

  private getCacheKey(query: string, profile: VisaProfile): string {
    return `${query}:${profile.destinationCountry}:${profile.visaType}:${profile.nationality}`;
  }

  async addSourceAttribution(
    results: RAGResult[],
  ): Promise<Array<RAGResult & { sourceUrl?: string }>> {
    return results.map((result) => {
      // Generate source URL based on metadata
      let sourceUrl: string | undefined;
      if (result.metadata?.country && result.metadata?.visaType) {
        const country = result.metadata.country;
        const visaType = result.metadata.visaType;
        // Map to official URLs (example)
        const urlMap: Record<string, string> = {
          "canada:student": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html",
          "usa:student": "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
          "canada:tourist": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html",
          "usa:tourist": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html",
        };
        sourceUrl = urlMap[`${country}:${visaType}`];
      }

      return { ...result, sourceUrl };
    });
  }

  async calculateConfidenceScore(results: RAGResult[]): Promise<number> {
    if (results.length === 0) return 0;

    // Average score weighted by number of results
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const resultCountFactor = Math.min(1.0, results.length / 5); // More results = higher confidence

    return avgScore * resultCountFactor;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const enhancedRAG = new EnhancedRAG();

