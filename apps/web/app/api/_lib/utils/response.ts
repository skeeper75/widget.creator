import { NextResponse } from 'next/server';
import { toSnakeCase } from './transform.js';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationLinks {
  self: string;
  next: string | null;
  prev: string | null;
  first: string;
  last: string;
}

/**
 * Single resource response envelope.
 * { data: { ... } }
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { data: toSnakeCase(data) },
    { status },
  );
}

/**
 * Collection resource response envelope with pagination.
 * { data: [...], meta: { page, limit, total, total_pages }, links: { self, next, prev, first, last } }
 */
export function collectionResponse<T>(
  data: T[],
  meta: PaginationMeta,
  links: PaginationLinks,
  status = 200,
): NextResponse {
  return NextResponse.json(
    {
      data: toSnakeCase(data),
      meta: toSnakeCase(meta),
      links: toSnakeCase(links),
    },
    { status },
  );
}

/**
 * Empty collection response.
 */
export function emptyCollectionResponse(basePath: string, limit = 20): NextResponse {
  return collectionResponse(
    [],
    { page: 1, limit, total: 0, totalPages: 0 },
    {
      self: basePath,
      next: null,
      prev: null,
      first: basePath,
      last: basePath,
    },
  );
}
