# API Architecture Documentation

## Overview

The VisaAI API follows RESTful principles with versioning, comprehensive error handling, rate limiting, and optimization features.

## Base URL

```
/api/v1
```

## Versioning

All API endpoints are versioned. Current version: `v1`

Future versions will be available at `/api/v2`, `/api/v3`, etc.

## Standard Response Format

All API responses follow this structure:

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
    documentation_url?: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `BATCH_ITEM_ERROR` | 200 | Error in batch item (partial success) |

## Rate Limiting

Rate limits are applied per endpoint and user/IP:

| Tier | Limit | Window |
|------|-------|-------|
| `default` | 100 requests | 60 seconds |
| `authenticated` | 500 requests | 60 seconds |
| `heavy` | 10 requests | 60 seconds |
| `chat` | 50 requests | 60 seconds |
| `assessment` | 20 requests | 60 seconds |

### Rate Limit Headers

All responses include rate limit headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

## Endpoints

### POST /visa-assessment

Analyze visa eligibility and generate checklist.

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "nationality": "string (required)",
  "currentCountry": "string (required)",
  "destinationCountry": "canada | usa | ...",
  "visaType": "student | tourist | ...",
  "purpose": "string (required)",
  "durationMonths": "number (optional)",
  "age": "number (optional)",
  "education": "string (optional)",
  "jobInfo": "string (optional)",
  "fundsAvailable": "number (optional)",
  "estimatedCosts": "number (optional)",
  "studyGapYears": "number (optional)",
  "priorRejection": "boolean (optional)",
  "preferredLanguage": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {...},
    "rules": [...],
    "analysis": {
      "eligibility": "Likely | Maybe | Risky",
      "summary": "string",
      "explanation": "string",
      "checklist": {
        "required": ["string"],
        "conditional": ["string"],
        "riskyOrMissing": ["string"]
      },
      "risks": ["string"]
    }
  }
}
```

### POST /chat

Chat with AI visa assistant.

**Rate Limit:** 50 requests/minute

**Request Body:**
```json
{
  "question": "string (required)",
  "language": "string (optional)",
  "context": {
    "nationality": "string (optional)",
    "destination": "string (optional)",
    "visaType": "string (optional)",
    "documentsUploaded": ["string"],
    "missingDocuments": ["string"],
    "riskLevel": "string (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "string",
    "question": "string",
    "timestamp": "ISO 8601 string"
  }
}
```

### POST /documents

Analyze uploaded documents.

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "destinationCountry": "string (required)",
  "visaType": "string (required)",
  "documents": [
    {
      "name": "string",
      "typeHint": "string (optional)",
      "textContent": "string (min 10 chars)"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "name": "string",
        "inferredType": "string",
        "issues": ["string"],
        "suggestions": ["string"]
      }
    ],
    "analyzedAt": "ISO 8601 string",
    "totalDocuments": "number"
  }
}
```

### GET /eligibility

Quick eligibility check.

**Rate Limit:** 100 requests/minute

**Query Parameters:**
- `nationality` (required)
- `destinationCountry` (required)
- `visaType` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "eligibility": "Likely | Maybe | Risky | Unknown",
    "nationality": "string",
    "destinationCountry": "string",
    "visaType": "string",
    "relevantRulesFound": "number",
    "checkedAt": "ISO 8601 string"
  }
}
```

**Caching:** Responses are cached for 1 hour.

### POST /batch

Batch operations.

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "operation": "create | update | delete | get",
  "items": [
    {
      "id": "string (optional)",
      "data": {}
    }
  ]
}
```

**Limits:**
- Maximum 100 items per batch

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "success": "boolean",
        "data": {...},
        "error": {...}
      }
    ],
    "summary": {
      "total": "number",
      "successful": "number",
      "failed": "number"
    }
  }
}
```

### GET /health

Health check endpoint.

**Rate Limit:** Unlimited

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "ISO 8601 string",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "llm": "configured",
      "rateLimit": "active"
    }
  }
}
```

### GET /docs

API documentation endpoint.

**Response:** Complete API documentation in JSON format.

## Pagination

List endpoints support pagination via query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/endpoint?page=2&limit=50
```

## Field Selection

Use sparse fieldsets to reduce response size:

- `fields`: Comma-separated list of fields to include
- `include`: Comma-separated list of related resources

**Example:**
```
GET /api/v1/endpoint?fields=id,name,status&include=documents
```

## Request Headers

- `Content-Type`: `application/json` (required for POST/PUT)
- `Authorization`: Bearer token (optional, for authenticated endpoints)
- `X-Request-ID`: Custom request ID for tracing (optional)

## Response Headers

- `X-Request-ID`: Unique request identifier
- `X-RateLimit-Limit`: Rate limit for the endpoint
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Cache-Control`: Caching directives
- `ETag`: Entity tag for cache validation
- `Retry-After`: Seconds to wait (when rate limited)

## Compression

Responses are automatically compressed using gzip/brotli when supported by the client.

## CORS

CORS is enabled for all API endpoints. Configure allowed origins via `ALLOWED_ORIGINS` environment variable.

## Error Handling

All errors follow the standard error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    },
    "timestamp": "ISO 8601 string",
    "requestId": "UUID",
    "documentation_url": "URL to error documentation"
  }
}
```

## Retry Logic

When rate limited (429), use the `Retry-After` header to determine when to retry.

For transient errors, implement exponential backoff:

1. First retry: 1 second
2. Second retry: 2 seconds
3. Third retry: 4 seconds
4. Maximum retries: 3

## Request Deduplication

Identical requests within a short time window are automatically deduplicated to prevent duplicate processing.

## Implementation Notes

### Rate Limiting

- Current implementation uses in-memory storage
- For production, replace with Redis-based implementation (see `src/lib/api/rateLimit.ts`)
- Rate limits are per IP/user ID

### Caching

- Eligibility endpoint responses are cached for 1 hour
- Use ETags for conditional requests
- Cache-Control headers are set automatically

### Compression

- Next.js handles compression automatically
- Supports gzip and brotli
- Compression headers are added automatically

## Migration from Legacy Endpoints

Legacy endpoints (`/api/analyze-profile`, `/api/assistant`, etc.) are still available for backward compatibility but will be deprecated in future versions.

**Migration Path:**
- `/api/analyze-profile` → `/api/v1/visa-assessment`
- `/api/assistant` → `/api/v1/chat`
- `/api/analyze-documents` → `/api/v1/documents`

## Support

For API support and questions, refer to:
- API Documentation: `/api/v1/docs`
- Health Check: `/api/v1/health`

