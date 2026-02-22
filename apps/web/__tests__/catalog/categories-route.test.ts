import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockWidgetToken } from '../setup.js';
import { CATEGORY_ROWS, ACTIVE_CATEGORY_ROWS } from '../fixtures/categories.js';

// Helper: create a NextRequest with a valid widget token for widget-auth routes.
async function createAuthenticatedRequest(
  url: string,
  options: { origin?: string } = {},
): Promise<NextRequest> {
  const origin = options.origin ?? 'http://localhost:3000';
  const token = await createMockWidgetToken({ allowed_origins: [origin] });
  return new NextRequest(url, {
    headers: {
      'x-widget-token': token,
      'origin': origin,
    },
  });
}

// Helper: create route context (required by withMiddleware)
function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

// Helper: configure mock db chain to return specified rows.
function mockDbSelectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe('GET /api/v1/catalog/categories', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return category tree with active categories only by default', async () => {
    mockDbSelectResult(ACTIVE_CATEGORY_ROWS);

    const { GET } = await import('../../app/api/v1/catalog/categories/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta.total).toBe(ACTIVE_CATEGORY_ROWS.length);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('should include inactive categories when include_inactive=true', async () => {
    mockDbSelectResult(CATEGORY_ROWS);

    const { GET } = await import('../../app/api/v1/catalog/categories/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories?include_inactive=true');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.total).toBe(CATEGORY_ROWS.length);
  });

  it('should build hierarchical tree structure', async () => {
    const rows = ACTIVE_CATEGORY_ROWS.filter(r => r.parentId === null || r.parentId === 1);
    mockDbSelectResult(rows);

    const { GET } = await import('../../app/api/v1/catalog/categories/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    const roots = body.data.filter((n: any) => n.depth === 0);
    expect(roots.length).toBeGreaterThan(0);
  });

  it('should respect depth parameter', async () => {
    mockDbSelectResult(ACTIVE_CATEGORY_ROWS);

    const { GET } = await import('../../app/api/v1/catalog/categories/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories?depth=0');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    for (const node of body.data) {
      expect(node.children).toEqual([]);
    }
  });

  it('should return empty tree when no categories exist', async () => {
    mockDbSelectResult([]);

    const { GET } = await import('../../app/api/v1/catalog/categories/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/categories');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('should return 401 when widget token is missing', async () => {
    const { GET } = await import('../../app/api/v1/catalog/categories/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/categories');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain('unauthorized');
  });
});
