import { describe, it, expect } from 'vitest';
import { successResponse, collectionResponse, emptyCollectionResponse } from '../../app/api/_lib/utils/response.js';

describe('successResponse', () => {
  it('should wrap data in { data } envelope', async () => {
    const response = successResponse({ id: 1, productName: 'Test' });
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body.data.id).toBe(1);
  });

  it('should convert keys to snake_case', async () => {
    const response = successResponse({ productName: 'Test', isActive: true });
    const body = await response.json();

    expect(body.data).toHaveProperty('product_name');
    expect(body.data).toHaveProperty('is_active');
    expect(body.data).not.toHaveProperty('productName');
    expect(body.data).not.toHaveProperty('isActive');
  });

  it('should default to status 200', () => {
    const response = successResponse({ ok: true });
    expect(response.status).toBe(200);
  });

  it('should accept custom status code', () => {
    const response = successResponse({ id: 'new' }, 201);
    expect(response.status).toBe(201);
  });
});

describe('collectionResponse', () => {
  it('should wrap data with meta and links', async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const meta = { page: 1, limit: 20, total: 2, totalPages: 1 };
    const links = {
      self: '/api/v1/items?page=1',
      next: null,
      prev: null,
      first: '/api/v1/items?page=1',
      last: '/api/v1/items?page=1',
    };

    const response = collectionResponse(data, meta, links);
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body).toHaveProperty('links');
    expect(body.data).toHaveLength(2);
  });

  it('should convert meta keys to snake_case', async () => {
    const meta = { page: 1, limit: 20, total: 50, totalPages: 3 };
    const links = {
      self: '/test',
      next: null,
      prev: null,
      first: '/test',
      last: '/test',
    };

    const response = collectionResponse([], meta, links);
    const body = await response.json();

    expect(body.meta).toHaveProperty('total_pages');
    expect(body.meta).not.toHaveProperty('totalPages');
  });

  it('should default to status 200', () => {
    const response = collectionResponse([], { page: 1, limit: 20, total: 0, totalPages: 0 }, {
      self: '/test', next: null, prev: null, first: '/test', last: '/test',
    });
    expect(response.status).toBe(200);
  });
});

describe('emptyCollectionResponse', () => {
  it('should return empty data array with zero total', async () => {
    const response = emptyCollectionResponse('/api/v1/items');
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.total_pages).toBe(0);
    expect(body.meta.page).toBe(1);
  });

  it('should use default limit of 20', async () => {
    const response = emptyCollectionResponse('/api/v1/items');
    const body = await response.json();

    expect(body.meta.limit).toBe(20);
  });

  it('should accept custom limit', async () => {
    const response = emptyCollectionResponse('/api/v1/items', 50);
    const body = await response.json();

    expect(body.meta.limit).toBe(50);
  });
});
