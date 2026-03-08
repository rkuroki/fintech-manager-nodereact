import type { PaginatedResponse } from '@investor-backoffice/shared';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
}

/**
 * Normalizes pagination query params and returns SQL-ready limit/offset values.
 */
export function parsePagination(opts: PaginationOptions = {}): PaginationResult {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    page,
    pageSize,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return { data, total, page, pageSize };
}
