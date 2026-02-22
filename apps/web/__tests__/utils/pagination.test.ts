import { describe, it, expect } from 'vitest';
import { paginate } from '../../app/api/_lib/utils/pagination.js';

describe('paginate', () => {
  it('should calculate correct meta for first page', () => {
    const result = paginate({ page: 1, limit: 20, total: 55, basePath: '/api/v1/products' });

    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 55,
      totalPages: 3,
    });
    expect(result.offset).toBe(0);
  });

  it('should calculate correct meta for middle page', () => {
    const result = paginate({ page: 2, limit: 20, total: 55, basePath: '/api/v1/products' });

    expect(result.meta.page).toBe(2);
    expect(result.offset).toBe(20);
  });

  it('should calculate correct meta for last page', () => {
    const result = paginate({ page: 3, limit: 20, total: 55, basePath: '/api/v1/products' });

    expect(result.meta.page).toBe(3);
    expect(result.offset).toBe(40);
  });

  it('should generate correct links for first page', () => {
    const result = paginate({ page: 1, limit: 10, total: 30, basePath: '/api/v1/items' });

    expect(result.links.prev).toBeNull();
    expect(result.links.next).toContain('page=2');
    expect(result.links.first).toContain('page=1');
    expect(result.links.last).toContain('page=3');
    expect(result.links.self).toContain('page=1');
  });

  it('should generate correct links for last page', () => {
    const result = paginate({ page: 3, limit: 10, total: 30, basePath: '/api/v1/items' });

    expect(result.links.next).toBeNull();
    expect(result.links.prev).toContain('page=2');
  });

  it('should generate correct links for middle page', () => {
    const result = paginate({ page: 2, limit: 10, total: 30, basePath: '/api/v1/items' });

    expect(result.links.prev).toContain('page=1');
    expect(result.links.next).toContain('page=3');
  });

  it('should handle zero total', () => {
    const result = paginate({ page: 1, limit: 20, total: 0, basePath: '/api/v1/items' });

    expect(result.meta.totalPages).toBe(0);
    expect(result.links.next).toBeNull();
    expect(result.links.prev).toBeNull();
  });

  it('should handle single page result', () => {
    const result = paginate({ page: 1, limit: 20, total: 5, basePath: '/api/v1/items' });

    expect(result.meta.totalPages).toBe(1);
    expect(result.links.next).toBeNull();
    expect(result.links.prev).toBeNull();
  });

  it('should include limit in link URLs', () => {
    const result = paginate({ page: 1, limit: 50, total: 100, basePath: '/api/v1/items' });

    expect(result.links.self).toContain('limit=50');
    expect(result.links.next).toContain('limit=50');
  });

  it('should handle exact page boundary', () => {
    const result = paginate({ page: 1, limit: 10, total: 10, basePath: '/api/v1/items' });

    expect(result.meta.totalPages).toBe(1);
    expect(result.links.next).toBeNull();
  });
});
