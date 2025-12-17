// Pagination Utilities

import type { PaginationParams, FieldSelection } from "./types";

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = 20,
  maxLimit: number = 100,
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit), 10)),
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function parseFieldSelection(searchParams: URLSearchParams): FieldSelection {
  const fields = searchParams.get("fields");
  const include = searchParams.get("include");

  return {
    ...(fields && { fields: fields.split(",").map((f) => f.trim()) }),
    ...(include && { include: include.split(",").map((i) => i.trim()) }),
  };
}

export function applyFieldSelection<T extends Record<string, any>>(
  items: T[],
  selection: FieldSelection,
): Partial<T>[] {
  if (!selection.fields && !selection.include) {
    return items;
  }

  return items.map((item) => {
    const result: Partial<T> = {};

    if (selection.fields) {
      selection.fields.forEach((field) => {
        if (field in item) {
          result[field as keyof T] = item[field];
        }
      });
    } else {
      // If no fields specified, include all fields
      Object.assign(result, item);
    }

    // Include related resources
    if (selection.include) {
      selection.include.forEach((rel) => {
        if (rel in item) {
          result[rel as keyof T] = item[rel];
        }
      });
    }

    return result;
  });
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: PaginationParams,
): PaginatedResult<T> {
  const { page = 1, limit = 20 } = pagination;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

