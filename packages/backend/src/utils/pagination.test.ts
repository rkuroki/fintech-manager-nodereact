import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginatedResponse } from './pagination.js';

describe('parsePagination', () => {
  it('returns default values', () => {
    const result = parsePagination();
    expect(result).toEqual({ limit: 20, offset: 0, page: 1, pageSize: 20 });
  });

  it('calculates correct offset', () => {
    const result = parsePagination({ page: 3, pageSize: 10 });
    expect(result.offset).toBe(20);
    expect(result.limit).toBe(10);
  });

  it('clamps pageSize to maximum of 100', () => {
    const result = parsePagination({ pageSize: 999 });
    expect(result.pageSize).toBe(100);
  });

  it('clamps page to minimum of 1', () => {
    const result = parsePagination({ page: -5 });
    expect(result.page).toBe(1);
  });
});

describe('buildPaginatedResponse', () => {
  it('builds correct structure', () => {
    const result = buildPaginatedResponse([1, 2, 3], 100, 2, 10);
    expect(result).toEqual({ data: [1, 2, 3], total: 100, page: 2, pageSize: 10 });
  });
});
