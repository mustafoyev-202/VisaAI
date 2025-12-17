# AI/ML Integration Architecture

## Overview

The VisaAI platform uses a comprehensive AI/ML integration architecture with multiple LLM providers, prompt management, enhanced RAG, and monitoring capabilities.

## Architecture Components

### 1. LLM Integration Layer

**Abstraction for Multiple Providers**

The system supports multiple LLM providers with automatic fallback:

```typescript
import { llmService } from "@/lib/ai/llmService";

// Generate with automatic fallback
const response = await llmService.generateWithFallback(
  "What documents do I need?",
  { temperature: 0.7, maxTokens: 500 },
  requestId
);

// Stream responses
for await (const chunk of llmService.streamWithFallback(prompt)) {
  console.log(chunk);
}
```

**Supported Providers:**
- Google Gemini (primary)
- OpenAI (fallback)

**Provider Interface:**
```typescript
interface LLMProvider {
  name: string;
  generateCompletion(prompt: string, config?: LLMConfig): Promise<LLMResponse>;
  streamCompletion(prompt: string, config?: LLMConfig): AsyncIterable<string>;
  isAvailable(): Promise<boolean>;
}
```

**Fallback Logic:**
1. Try primary provider (Gemini)
2. On failure, automatically try fallback (OpenAI)
3. Track metrics for each attempt
4. Throw error only if all providers fail

### 2. Prompt Management System

**Versioned Prompt Templates**

Prompts are versioned and stored with performance metrics:

```typescript
import { promptManager } from "@/lib/ai/promptManager";

// Get prompt with variable interpolation
const prompt = await promptManager.getPrompt("visa-assessment", {
  userProfile: profile,
  metadata: {
    rules: ragContext,
    languageInstruction: "Explain in simple English"
  }
});
```

**Features:**
- **Versioning**: Multiple versions of prompts
- **Variable Interpolation**: `{{variable}}` syntax
- **Conditional Blocks**: `{{#if condition}}...{{/if}}`
- **A/B Testing**: Automatic variant selection
- **Caching**: Common queries cached for 1 hour
- **Performance Tracking**: Latency, quality, success rate

**Prompt Template Structure:**
```typescript
interface PromptTemplate {
  id: string;
  version: number;
  name: string;
  template: string;
  variables: string[];
  isActive: boolean;
  testVariant?: string;
  performance?: {
    avgLatency: number;
    avgQuality: number;
    totalUses: number;
    successRate: number;
  };
}
```

**A/B Testing:**
- Prompts can have test variants
- Variants selected based on session hash (50/50 split)
- Performance tracked separately for each variant

### 3. Enhanced RAG (Retrieval-Augmented Generation)

**Vector Database Support**

The system uses vector stores for semantic search:

```typescript
import { enhancedRAG } from "@/lib/ai/rag/enhancedRAG";

// Retrieve relevant context
const results = await enhancedRAG.retrieve(
  "Canada student visa requirements",
  profile,
  { topK: 5, minScore: 0.6 }
);
```

**Features:**
- **Semantic Search**: Cosine similarity for context retrieval
- **Context Ranking**: Results ranked by relevance
- **Source Attribution**: Links to official resources
- **Confidence Scoring**: Confidence scores for retrieved context
- **Caching**: Frequent queries cached for 1 hour
- **Filtering**: Filter by country, visa type, etc.

**Vector Store Abstraction:**
- In-memory store (MVP)
- Ready for Pinecone/Weaviate/Qdrant integration
- Document chunking strategy
- Metadata filtering

**RAG Result Structure:**
```typescript
interface RAGResult {
  content: string;
  score: number;
  source: string;
  metadata?: Record<string, any>;
  sourceUrl?: string; // Official resource link
}
```

### 4. Model Monitoring

**Comprehensive Metrics Tracking**

All AI operations are monitored:

```typescript
import { trackMetrics, getProviderStats, getAlerts } from "@/lib/ai/monitoring";

// Track metrics automatically (done in llmService)
// Or manually:
await trackMetrics({
  requestId: "uuid",
  provider: "gemini",
  model: "gemini-2.5-flash",
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300,
  latency: 1500,
  timestamp: new Date(),
  success: true,
  qualityScore: 0.85
});

// Get provider statistics
const stats = await getProviderStats("gemini");
// Returns: { totalRequests, successRate, avgLatency, avgTokens, errorRate }

// Get alerts
const alerts = await getAlerts(false, "high");
```

**Tracked Metrics:**
- Token usage (prompt, completion, total)
- Response latency
- Success/failure rates
- Quality scores
- User satisfaction
- Hallucination detection

**Alert Types:**
- **Latency**: High response times
- **Error Rate**: Provider failures
- **Quality**: Low quality scores
- **Token Usage**: Excessive token consumption
- **Hallucination**: Detected hallucinations

**Alert Thresholds:**
- Latency: Warning > 3s, Critical > 5s
- Error Rate: Warning > 10%, Critical > 20%
- Quality: Warning < 0.6, Critical < 0.5
- Token Usage: Warning > 10k, Critical > 20k

**Quality Scoring:**
- Length appropriateness
- Key phrase presence
- Structure completeness
- Context relevance

**Hallucination Detection:**
- Compares response claims with context
- Flags numeric claims not in source
- Provides confidence scores

## Integration Example

**Complete AI Generation Flow:**

```typescript
import { generateWithAI } from "@/lib/ai/integration";

const result = await generateWithAI({
  promptId: "visa-assessment",
  profile: {
    nationality: "Indian",
    currentCountry: "India",
    destinationCountry: "canada",
    visaType: "student",
    purpose: "Master's degree",
  },
  variables: {
    languageInstruction: "Explain in simple English",
  },
  config: {
    temperature: 0.7,
    maxTokens: 1000,
  },
  enableRAG: true,
  enableMonitoring: true,
});

// Result includes:
// - content: Generated text
// - sources: RAG-retrieved context with scores
// - metrics: Latency, tokens, quality, hallucination check
```

## API Endpoints

### GET /api/v1/monitoring

Get monitoring metrics and statistics.

**Query Parameters:**
- `provider`: Filter by provider name
- `startDate`: Start date for metrics
- `endDate`: End date for metrics
- `alerts`: Include alerts (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [...],
    "stats": {
      "totalRequests": 1000,
      "successRate": 0.95,
      "avgLatency": 1500,
      "avgTokens": 500,
      "errorRate": 0.05
    },
    "alerts": [...],
    "summary": {
      "totalRequests": 1000,
      "successfulRequests": 950,
      "failedRequests": 50,
      "avgLatency": 1500,
      "avgTokens": 500
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# LLM Providers
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key  # Optional, for fallback

# Vector Database (when using Pinecone/Weaviate)
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=visa-rules

# Monitoring
MONITORING_ENABLED=true
ALERT_WEBHOOK_URL=https://your-monitoring-service.com/alerts
```

## Production Considerations

### Vector Database Migration

Replace in-memory store with production vector database:

1. **Pinecone:**
```typescript
import { PineconeVectorStore } from "@/lib/ai/rag/vectorStore";
const vectorStore = new PineconeVectorStore(apiKey, indexName);
await vectorStore.initialize();
```

2. **Weaviate:**
```typescript
import { WeaviateVectorStore } from "@/lib/ai/rag/vectorStore";
const vectorStore = new WeaviateVectorStore(url, apiKey);
```

3. **Qdrant:**
```typescript
import { QdrantVectorStore } from "@/lib/ai/rag/vectorStore";
const vectorStore = new QdrantVectorStore(url, apiKey);
```

### Database Storage

Replace in-memory stores with database:

- **Prompts**: Store in PostgreSQL/MongoDB
- **Metrics**: Store in time-series database (InfluxDB, TimescaleDB)
- **Alerts**: Store in database with notification system

### Monitoring Integration

Integrate with monitoring services:

- **Sentry**: Error tracking
- **Datadog/New Relic**: Performance monitoring
- **PagerDuty**: Alert notifications
- **Grafana**: Metrics visualization

### Prompt Versioning

Implement database-backed prompt versioning:

```sql
CREATE TABLE prompts (
  id VARCHAR PRIMARY KEY,
  version INTEGER,
  name VARCHAR,
  template TEXT,
  variables JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Best Practices

1. **Always use request IDs** for tracing
2. **Enable monitoring** in production
3. **Use RAG** for context-aware responses
4. **Track quality scores** and user satisfaction
5. **Set up alerts** for critical thresholds
6. **Version prompts** before major changes
7. **A/B test** prompt improvements
8. **Cache** common queries
9. **Monitor token usage** to control costs
10. **Use fallback providers** for reliability

## Performance Optimization

- **Caching**: Prompts and RAG results cached
- **Batch Processing**: Batch multiple requests
- **Streaming**: Use streaming for long responses
- **Connection Pooling**: Reuse provider connections
- **Async Processing**: Non-blocking operations

## Security

- **API Keys**: Stored in environment variables
- **Rate Limiting**: Per-provider rate limits
- **Input Validation**: Validate all prompts and inputs
- **Output Sanitization**: Sanitize AI responses
- **Audit Logging**: Log all AI operations

## Troubleshooting

### Provider Failures

Check provider availability:
```typescript
const isAvailable = await llmService.checkProviderHealth("gemini");
```

### High Latency

- Check provider status
- Review prompt complexity
- Consider caching
- Check network connectivity

### Quality Issues

- Review prompt templates
- Check RAG context relevance
- Adjust temperature/top-p
- Review quality scores

### High Token Usage

- Optimize prompts
- Reduce context size
- Use field selection
- Implement caching

## Future Enhancements

- [ ] Fine-tuned models for visa domain
- [ ] Multi-modal support (images, PDFs)
- [ ] Real-time streaming with WebSockets
- [ ] Advanced hallucination detection
- [ ] Automated prompt optimization
- [ ] Cost tracking per user/organization
- [ ] Model comparison dashboard
- [ ] Custom embedding models

