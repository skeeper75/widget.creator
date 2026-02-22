import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockWidgetToken } from '../setup.js';
import { CATEGORY_ROWS } from '../fixtures/categories.js';

async function createAuthenticatedRequest(url: string): Promise<NextRequest> {
  const origin = 'http://localhost:3000';
  const token = await createMockWidgetToken({ allowed_origins: [origin] });
  return new NextRequest(url, {
    headers: { 'x-widget-token': token, 'origin': origin },
  });
}

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

// The detail route calls db.select() three times:
// 1. Fetch category row
// 2. Count products
// 3. Count children
function mockDetailQueries(
  categoryRow: unknown | null,
  productCount = 5,
  childrenCount = 2,
) {
  let callIndex = 0;

  (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    callIndex++;
    if (callIndex === 1) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(categoryRow ? [categoryRow] : []),
        }),
      };
    }
    if (callIndex === 2) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ value: productCount }]),
        }),
      };
    }
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: childrenCount }]),
      }),
    };
  });
}

describe('GET /api/v1/catalog/categories/:id', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return category detail with counts', async () => {
    const row = CATEGORY_ROWS[0];
    mockDetailQueries(row, 10, 3);

    const { GET } = await import('../../app/api/v1/catalog/categories/[id]/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories/1');

    const response = await GET(req, routeCtx({ id: '1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('data');
    expect(body.data.id).toBe(row.id);
    expect(body.data.product_count).toBe(10);
    expect(body.data.children_count).toBe(3);
  });

  it('should return 404 for non-existent category', async () => {
    mockDetailQueries(null);

    const { GET } = await import('../../app/api/v1/catalog/categories/[id]/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories/999');

    const response = await GET(req, routeCtx({ id: '999' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should convert response keys to snake_case', async () => {
    const row = CATEGORY_ROWS[0];
    mockDetailQueries(row, 5, 2);

    const { GET } = await import('../../app/api/v1/catalog/categories/[id]/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories/1');

    const response = await GET(req, routeCtx({ id: '1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveProperty('display_order');
    expect(body.data).toHaveProperty('is_active');
    expect(body.data).toHaveProperty('icon_url');
    expect(body.data).toHaveProperty('parent_id');
  });

  it('should return 401 without widget token', async () => {
    const { GET } = await import('../../app/api/v1/catalog/categories/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/categories/1');

    const response = await GET(req, routeCtx({ id: '1' }));

    expect(response.status).toBe(401);
  });
});
