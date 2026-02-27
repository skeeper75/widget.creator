import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockWidgetToken } from '../setup.js';

async function createAuthenticatedPostRequest(
  url: string,
  body: unknown,
): Promise<NextRequest> {
  const origin = 'http://localhost:3000';
  const token = await createMockWidgetToken({ allowed_origins: [origin] });
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-widget-token': token,
      'origin': origin,
    },
    body: JSON.stringify(body),
  });
}

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

const MOCK_PRODUCT = {
  id: 42,
  name: 'Test Product',
  pricingModel: 'fixed_unit',
  isActive: true,
  categoryId: 1,
};

// The preview route calls:
// 1. db.select().from(products).where() -> product row
// 2. Price range query (min/max)
function mockPreviewQueries(
  product: Record<string, unknown> | null,
  priceRange: { minPrice: number | null; maxPrice: number | null } = { minPrice: 5000, maxPrice: 50000 },
) {
  let callIndex = 0;

  (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    callIndex++;
    if (callIndex === 1) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(product ? [product] : []),
        }),
      };
    }
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([priceRange]),
      }),
    };
  });
}

describe('POST /api/v1/pricing/quote/preview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return price range estimate', async () => {
    mockPreviewQueries(MOCK_PRODUCT, { minPrice: 5000, maxPrice: 50000 });

    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      { product_id: 42, quantity: 500 },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveProperty('price_range');
    expect(body.data.price_range).toHaveProperty('min');
    expect(body.data.price_range).toHaveProperty('max');
    expect(body.data.price_range.currency).toBe('KRW');
  });

  it('should indicate missing options', async () => {
    mockPreviewQueries(MOCK_PRODUCT);

    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      { product_id: 42, quantity: 100 },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.is_estimate).toBe(true);
    expect(body.data.missing_options).toContain('size_id');
    expect(body.data.missing_options).toContain('paper_id');
  });

  it('should not list missing options when all provided', async () => {
    mockPreviewQueries(MOCK_PRODUCT);

    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      {
        product_id: 42,
        quantity: 500,
        size_id: 15,
        paper_id: 8,
        print_mode_id: 4,
        page_count: 100,
        binding_id: 3,
      },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.is_estimate).toBe(false);
    expect(body.data.missing_options).toEqual([]);
  });

  it('should return 404 for non-existent product', async () => {
    mockPreviewQueries(null);

    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      { product_id: 999, quantity: 100 },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 422 for invalid request body', async () => {
    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      {},
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.type).toContain('validation');
  });

  it('should return 401 without widget token', async () => {
    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/pricing/quote/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: 42, quantity: 100 }),
    });

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(401);
  });

  it('should handle null price range gracefully', async () => {
    mockPreviewQueries(MOCK_PRODUCT, { minPrice: null, maxPrice: null });

    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      { product_id: 42, quantity: 100 },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.price_range.min).toBe(0);
    expect(body.data.price_range.max).toBe(0);
  });

  it('should use package prices for package pricing model', async () => {
    const packageProduct = { ...MOCK_PRODUCT, pricingModel: 'package' };
    mockPreviewQueries(packageProduct, { minPrice: 30000, maxPrice: 80000 });

    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      { product_id: 42, quantity: 100 },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    // Package prices are not multiplied by quantity
    expect(body.data.price_range.min).toBe(30000);
    expect(body.data.price_range.max).toBe(80000);
  });

  it('should use price tiers for formula-based pricing model', async () => {
    const tierProduct = { ...MOCK_PRODUCT, pricingModel: 'tier' };
    mockPreviewQueries(tierProduct, { minPrice: 50, maxPrice: 200 });

    const { POST } = await import('../../app/api/v1/pricing/quote/preview/route.js');
    const req = await createAuthenticatedPostRequest(
      'http://localhost:3000/api/v1/pricing/quote/preview',
      { product_id: 42, quantity: 100 },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    // Tier prices are multiplied by quantity
    expect(body.data.price_range.min).toBe(5000);  // 50 * 100
    expect(body.data.price_range.max).toBe(20000);  // 200 * 100
  });
});
