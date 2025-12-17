// API Types and Interfaces

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
  documentation_url?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds until retry allowed
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface FieldSelection {
  fields?: string[]; // Sparse fieldsets
  include?: string[]; // Related resources
}

export interface BatchRequest<T> {
  items: T[];
  operation: "create" | "update" | "delete" | "get";
}

export interface BatchResponse<T> {
  results: Array<{
    success: boolean;
    data?: T;
    error?: APIError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

