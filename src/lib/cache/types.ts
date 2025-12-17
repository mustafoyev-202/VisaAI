// Caching Types and Interfaces

export interface CachedResponse {
  id: string;
  query: string;
  response: string;
  embedding?: number[];
  timestamp: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size
  strategy?: "lru" | "lfu" | "fifo"; // Eviction strategy
}

export interface SemanticCacheResult {
  cached: boolean;
  response?: CachedResponse;
  similarity?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

