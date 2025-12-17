# Caching Strategy Documentation

## Overview

Multi-layer caching strategy for optimal performance across client, CDN, application, database, and LLM layers.

## Caching Layers

### 1. Client-Side Caching (Service Worker)

**Location:** `public/sw.js`

**Features:**
- Cache static assets (HTML, CSS, JS)
- Cache-first strategy for assets
- Network fallback
- Background sync for offline support
- Push notifications support

**Registration:**
```typescript
// Automatically registered in layout.tsx
navigator.serviceWorker.register("/sw.js");
```

**Cached Assets:**
- Static pages
- CSS files
- JavaScript bundles
- Images and fonts

**Cache Strategy:**
- **Cache First**: Serve from cache, fallback to network
- **Network First**: For API requests (delegated to server-side caching)

### 2. CDN Caching (CloudFlare/CloudFront)

**Configuration:**
```typescript
import { addCDNHeaders } from "@/lib/cache/cdn";

const response = addCDNHeaders(response, {
  provider: "cloudflare",
  edgeCacheTTL: 3600, // 1 hour at edge
  browserCacheTTL: 300, // 5 minutes in browser
});
```

**Headers:**
- `Cache-Control`: `public, max-age=300, s-maxage=3600`
- `Vary`: `Accept-Encoding, Accept-Language`
- `CF-Cache-Status`: CloudFlare cache status

**Purge Cache:**
```typescript
import { purgeCDNCache } from "@/lib/cache/cdn";

await purgeCDNCache([
  "https://yourdomain.com/api/v1/visa-assessment",
  "https://yourdomain.com/api/v1/eligibility",
]);
```

### 3. Application-Level Caching (Redis)

**Redis Cache Instances:**
- `sessionCache`: User sessions
- `apiCache`: API responses
- `queryCache`: Database query results

**Usage:**
```typescript
import { apiCache } from "@/lib/cache/redis";

// Get cached value
const cached = await apiCache.get<string>("key");

// Set cached value
await apiCache.set("key", "value", 3600); // TTL in seconds

// Get or set pattern
const value = await apiCache.getOrSet(
  "key",
  async () => {
    // Fetch from source
    return fetchData();
  },
  3600
);
```

**Cache Middleware:**
```typescript
import { withCache } from "@/lib/cache/middleware";

export async function GET(request: NextRequest) {
  return withCache(
    request,
    async () => {
      // Handler logic
      return createSuccessResponse(data);
    },
    {
      ttl: 3600,
      key: "custom-key",
      useSemanticCache: false,
    }
  );
}
```

### 4. Database Query Caching

**Usage:**
```typescript
import { getCachedQueryOrExecute } from "@/lib/cache/database";

const users = await getCachedQueryOrExecute(
  "SELECT * FROM users WHERE id = $1",
  async () => {
    return db.query("SELECT * FROM users WHERE id = $1", [userId]);
  },
  { id: userId },
  {
    ttl: 600, // 10 minutes
    tags: ["user", `user:${userId}`], // For invalidation
  }
);
```

**Cache Invalidation:**
```typescript
import { invalidateQueryCache } from "@/lib/cache/database";

// Invalidate by tags
await invalidateQueryCache(["user", "user:123"]);

// Invalidate all query cache
await invalidateQueryCache();
```

### 5. LLM Semantic Caching

**Implementation:**
```typescript
import { semanticCacheInstance } from "@/lib/cache/semantic";

// Check for similar response
const result = await semanticCacheInstance.searchSimilar(
  "What documents do I need for Canada student visa?",
  0.95 // Similarity threshold
);

if (result.cached) {
  return result.response; // Use cached response
}

// Generate new response and cache it
const response = await generateAIResponse(query);
await semanticCacheInstance.cacheResponse(query, response, 3600);
```

**Features:**
- Embedding-based similarity search
- Cosine similarity threshold (default: 0.95)
- Automatic caching of AI responses
- Configurable TTL

**How It Works:**
1. Generate embedding for user query
2. Search for similar embeddings in cache
3. If similarity >= threshold, return cached response
4. Otherwise, generate new response and cache it

## Cache Configuration

### Environment Variables

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# CDN
CDN_PROVIDER=cloudflare
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ZONE_ID=your_zone_id

# AWS CloudFront (alternative)
AWS_DISTRIBUTION_ID=your_distribution_id
```

### Cache TTLs

| Cache Type | Default TTL | Configurable |
|------------|-------------|--------------|
| Static Assets | 1 year | Yes |
| API Responses | 1 hour | Yes |
| Database Queries | 5 minutes | Yes |
| Semantic Cache | 1 hour | Yes |
| Sessions | 24 hours | Yes |

## API Endpoints

### GET /api/v1/cache/stats

Get cache statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "api": {
      "hits": 1000,
      "misses": 200,
      "size": 500,
      "hitRate": 0.833,
      "type": "redis"
    },
    "query": {
      "hits": 500,
      "misses": 100,
      "size": 200,
      "hitRate": 0.833,
      "type": "redis"
    },
    "semantic": {
      "size": 100,
      "type": "in-memory"
    },
    "summary": {
      "totalHits": 1500,
      "totalMisses": 300,
      "totalSize": 800,
      "overallHitRate": 0.833
    }
  }
}
```

### POST /api/v1/cache/clear

Clear cache (admin only).

**Request:**
```json
{
  "type": "all" // all, api, query, session, semantic
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cleared": 4,
    "cacheType": "all",
    "message": "Cleared all cache"
  }
}
```

## Integration Examples

### Chat API with Semantic Caching

```typescript
export async function POST(request: NextRequest) {
  return withCache(
    request,
    async () => {
      const { question } = await request.json();
      
      // Check semantic cache
      const semanticResult = await semanticCacheInstance.searchSimilar(question, 0.95);
      if (semanticResult.cached) {
        return createSuccessResponse({
          answer: semanticResult.response.response,
          cached: true,
          similarity: semanticResult.similarity,
        });
      }
      
      // Generate response
      const response = await generateAIResponse(question);
      
      // Cache semantically
      await semanticCacheInstance.cacheResponse(question, response, 3600);
      
      return createSuccessResponse({ answer: response, cached: false });
    },
    {
      ttl: 3600,
      useSemanticCache: true,
      semanticThreshold: 0.95,
    }
  );
}
```

### Database Query Caching

```typescript
async function getUserProfile(userId: string) {
  return getCachedQueryOrExecute(
    "SELECT * FROM users WHERE id = $1",
    async () => {
      return db.query("SELECT * FROM users WHERE id = $1", [userId]);
    },
    { userId },
    {
      ttl: 600,
      tags: ["user", `user:${userId}`],
    }
  );
}

// Invalidate when user updates
async function updateUser(userId: string, data: any) {
  await db.query("UPDATE users SET ... WHERE id = $1", [userId]);
  await invalidateQueryCache(["user", `user:${userId}`]);
}
```

## Cache Invalidation Strategies

### Time-Based (TTL)
- Automatic expiration after TTL
- No manual invalidation needed
- Simple but less precise

### Tag-Based
- Invalidate related caches together
- More precise control
- Example: `invalidateQueryCache(["user", "user:123"])`

### Event-Based
- Invalidate on data changes
- Most precise
- Requires event system

### Manual
- Admin-triggered cache clear
- Emergency cache refresh
- Via `/api/v1/cache/clear` endpoint

## Performance Optimization

### Cache Hit Rates

**Target Hit Rates:**
- Static Assets: > 95%
- API Responses: > 80%
- Database Queries: > 70%
- Semantic Cache: > 60%

### Cache Warming

Pre-populate cache with frequently accessed data:

```typescript
async function warmCache() {
  const popularQueries = [
    "What documents do I need for Canada student visa?",
    "How long does visa processing take?",
    "What are the financial requirements?",
  ];
  
  for (const query of popularQueries) {
    const response = await generateAIResponse(query);
    await semanticCacheInstance.cacheResponse(query, response, 3600);
  }
}
```

### Cache Compression

Responses are automatically compressed:
- Gzip/Brotli compression
- Reduces bandwidth
- Faster transfer

## Production Considerations

### Redis Integration

Replace mock Redis with production client:

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export const apiCache = new RedisCache("visa:api:", redis);
```

### Vector Database for Semantic Cache

Replace in-memory semantic cache with vector DB:

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index('visa-semantic-cache');

// Store embedding
await index.upsert([{
  id: cacheId,
  values: embedding,
  metadata: { query, response }
}]);

// Search similar
const results = await index.query({
  vector: queryEmbedding,
  topK: 1,
  minScore: 0.95
});
```

### CDN Configuration

**CloudFlare:**
- Enable caching rules
- Set page rules for API endpoints
- Configure cache purging

**CloudFront:**
- Create distribution
- Configure behaviors
- Set up invalidation paths

## Monitoring

**Metrics to Track:**
- Cache hit rates per layer
- Cache size and memory usage
- Response times (cached vs uncached)
- Cache eviction rates
- Semantic cache similarity scores

**Alerts:**
- Low hit rates (< 50%)
- High memory usage (> 80%)
- Cache failures
- CDN cache misses

## Best Practices

1. **Set appropriate TTLs** based on data freshness requirements
2. **Use semantic caching** for AI responses to reduce LLM calls
3. **Invalidate cache** when data changes
4. **Monitor hit rates** and adjust TTLs accordingly
5. **Use cache tags** for efficient invalidation
6. **Warm cache** with popular queries
7. **Compress responses** to reduce bandwidth
8. **Use CDN** for global distribution
9. **Implement cache versioning** for breaking changes
10. **Test cache behavior** in staging environment

## Cache Headers Reference

**Cache-Control:**
- `public`: Can be cached by CDN
- `private`: Only browser cache
- `max-age`: Browser cache TTL
- `s-maxage`: CDN cache TTL
- `no-cache`: Revalidate before use
- `no-store`: Don't cache

**ETag:**
- Entity tag for cache validation
- Conditional requests (`If-None-Match`)
- 304 Not Modified responses

**Vary:**
- Headers that affect cache key
- `Vary: Accept-Encoding, Authorization`
- Ensures correct cache version

