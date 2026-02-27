import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockWidgetToken } from '../setup.js';
import { ACTIVE_PRODUCT_ROWS } from '../fixtures/products.js';

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

// The products list route calls db.select() twice:
// 1. Count query -> [{ value: total }]
// 2. Data query with join -> rows of { product, category }
function mockProductListQueries(
  rows: typeof ACTIVE_PRODUCT_ROWS,
  total: number,
) {
  let callIndex = 0;

  (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    callIndex++;
    if (callIndex === 1) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ value: total }]),
        }),
      };
    }
    return {
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(
                  rows.map(p => ({
                    product: p,
                    category: { id: p.categoryId, code: 'CAT01', name: 'Category' },
                  })),
                ),
              }),
            }),
          }),
        }),
      }),
    };
  });
}

describe('GET /api/v1/catalog/products', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return paginated product list', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS, ACTIVE_PRODUCT_ROWS.length);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body).toHaveProperty('links');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.total).toBe(ACTIVE_PRODUCT_ROWS.length);
  });

  it('should include category info in each product', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS.slice(0, 1), 1);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[0]).toHaveProperty('category');
    expect(body.data[0].category).toHaveProperty('id');
    expect(body.data[0].category).toHaveProperty('code');
    expect(body.data[0].category).toHaveProperty('name');
  });

  it('should convert response keys to snake_case', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS.slice(0, 1), 1);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    const product = body.data[0];
    expect(product).toHaveProperty('category_id');
    expect(product).toHaveProperty('huni_code');
    expect(product).toHaveProperty('product_type');
    expect(product).toHaveProperty('pricing_model');
    expect(product).toHaveProperty('is_active');
  });

  it('should return empty collection for no results', async () => {
    mockProductListQueries([], 0);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('should return 401 without widget token', async () => {
    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/products');

    const response = await GET(req, routeCtx());

    expect(response.status).toBe(401);
  });

  it('should include pagination links', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS.slice(0, 2), 50);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products?page=2&limit=2');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.page).toBe(2);
    expect(body.meta.limit).toBe(2);
    expect(body.links.prev).not.toBeNull();
    expect(body.links.next).not.toBeNull();
  });

  it('should apply category_id filter', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS.slice(0, 1), 1);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products?category_id=1');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('should apply product_type filter', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS.slice(0, 1), 1);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products?product_type=business_card');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
  });

  it('should apply pricing_model filter', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS.slice(0, 1), 1);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products?pricing_model=tier');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
  });

  it('should apply search filter', async () => {
    mockProductListQueries(ACTIVE_PRODUCT_ROWS.slice(0, 1), 1);

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products?search=booklet');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
  });

  it('should handle null category in product row', async () => {
    let callIndex = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 1 }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([
                    {
                      product: ACTIVE_PRODUCT_ROWS[0],
                      category: null,
                    },
                  ]),
                }),
              }),
            }),
          }),
        }),
      };
    });

    const { GET } = await import('../../app/api/v1/catalog/products/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[0].category).toBeNull();
  });
});
