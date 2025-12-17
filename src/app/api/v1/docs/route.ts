import { NextRequest } from "next/server";
import { createSuccessResponse } from "@/lib/api/middleware";

export async function GET(request: NextRequest) {
  const documentation = {
    version: "1.0.0",
    baseUrl: "/api/v1",
    endpoints: [
      {
        path: "/visa-assessment",
        method: "POST",
        description: "Analyze visa eligibility and generate checklist",
        rateLimit: "20 requests/minute",
        requestBody: {
          nationality: "string (required)",
          currentCountry: "string (required)",
          destinationCountry: "string (required)",
          visaType: "string (required)",
          purpose: "string (required)",
          durationMonths: "number (optional)",
          age: "number (optional)",
          education: "string (optional)",
          jobInfo: "string (optional)",
          fundsAvailable: "number (optional)",
          estimatedCosts: "number (optional)",
          studyGapYears: "number (optional)",
          priorRejection: "boolean (optional)",
          preferredLanguage: "string (optional)",
        },
        response: {
          success: "boolean",
          data: {
            profile: "object",
            rules: "array",
            analysis: {
              eligibility: "Likely | Maybe | Risky",
              summary: "string",
              explanation: "string",
              checklist: "object",
              risks: "array",
            },
          },
        },
      },
      {
        path: "/chat",
        method: "POST",
        description: "Chat with AI visa assistant",
        rateLimit: "50 requests/minute",
        requestBody: {
          question: "string (required)",
          language: "string (optional)",
          context: "object (optional)",
        },
        response: {
          success: "boolean",
          data: {
            answer: "string",
            question: "string",
            timestamp: "string",
          },
        },
      },
      {
        path: "/documents",
        method: "POST",
        description: "Analyze uploaded documents",
        rateLimit: "10 requests/minute",
        requestBody: {
          destinationCountry: "string (required)",
          visaType: "string (required)",
          documents: "array (required)",
        },
        response: {
          success: "boolean",
          data: {
            documents: "array",
            analyzedAt: "string",
            totalDocuments: "number",
          },
        },
      },
      {
        path: "/eligibility",
        method: "GET",
        description: "Quick eligibility check",
        rateLimit: "100 requests/minute",
        queryParams: {
          nationality: "string (required)",
          destinationCountry: "string (required)",
          visaType: "string (required)",
        },
        response: {
          success: "boolean",
          data: {
            eligibility: "string",
            nationality: "string",
            destinationCountry: "string",
            visaType: "string",
            relevantRulesFound: "number",
            checkedAt: "string",
          },
        },
      },
      {
        path: "/batch",
        method: "POST",
        description: "Batch operations",
        rateLimit: "10 requests/minute",
        requestBody: {
          operation: "create | update | delete | get",
          items: "array (max 100 items)",
        },
        response: {
          success: "boolean",
          data: {
            results: "array",
            summary: {
              total: "number",
              successful: "number",
              failed: "number",
            },
          },
        },
      },
      {
        path: "/health",
        method: "GET",
        description: "Health check endpoint",
        rateLimit: "unlimited",
        response: {
          success: "boolean",
          data: {
            status: "string",
            timestamp: "string",
            version: "string",
            services: "object",
          },
        },
      },
    ],
    errorCodes: {
      VALIDATION_ERROR: "Invalid input data (400)",
      RATE_LIMIT_EXCEEDED: "Rate limit exceeded (429)",
      UNAUTHORIZED: "Authentication required (401)",
      INTERNAL_SERVER_ERROR: "Server error (500)",
      BATCH_ITEM_ERROR: "Error processing batch item",
    },
    rateLimits: {
      default: "100 requests/minute",
      authenticated: "500 requests/minute",
      heavy: "10 requests/minute",
      chat: "50 requests/minute",
      assessment: "20 requests/minute",
    },
    headers: {
      "X-RateLimit-Limit": "Rate limit for the endpoint",
      "X-RateLimit-Remaining": "Remaining requests in current window",
      "X-RateLimit-Reset": "Unix timestamp when limit resets",
      "X-Request-ID": "Unique request identifier for tracing",
      "Retry-After": "Seconds to wait before retrying (when rate limited)",
    },
    pagination: {
      page: "Page number (default: 1)",
      limit: "Items per page (default: 20, max: 100)",
    },
    fieldSelection: {
      fields: "Comma-separated list of fields to include",
      include: "Comma-separated list of related resources",
    },
  };

  return createSuccessResponse(documentation, undefined, 200);
}

