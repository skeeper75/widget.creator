import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockWidgetToken } from '../setup.js';

const ORIGIN = 'http://localhost:3000';

async function createAuthenticatedRequest(
  url: string,
  searchParams?: Record<string, string>,
): Promise<NextRequest> {
  const token = await createMockWidgetToken({ allowed_origins: [ORIGIN] });
  const fullUrl = new URL(url);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      fullUrl.searchParams.set(k, v);
    }
  }
  return new NextRequest(fullUrl, {
    headers: { 'x-widget-token': token, 'origin': ORIGIN },
  });
}

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

// ─── GET /api/v1/pricing/products/:id/price-tiers ────────────

describe('GET /api/v1/pricing/products/:id/price-tiers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockPriceTierQueries(
    product: Record<string, unknown> | null,
    tables: Record<string, unknown>[] = [],
    tiers: Record<string, unknown>[] = [],
  ) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // product lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(product ? [product] : []),
          }),
        };
      }
      if (selectCall === 2) {
        // price tables
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(tables),
          }),
        };
      }
      // price tiers
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(tiers),
          }),
        }),
      };
    });
  }

  it('should return price tiers grouped by table', async () => {
    const product = { id: 42 };
    const tables = [
      { id: 1, code: 'PT-001', name: 'Standard', priceType: 'unit', quantityBasis: 'sheet' },
    ];
    const tiers = [
      { id: 10, priceTableId: 1, optionCode: 'default', minQty: 1, maxQty: 499, unitPrice: '100' },
      { id: 11, priceTableId: 1, optionCode: 'default', minQty: 500, maxQty: 999, unitPrice: '80' },
    ];
    mockPriceTierQueries(product, tables, tiers);

    const { GET } = await import('../../app/api/v1/pricing/products/[id]/price-tiers/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/pricing/products/42/price-tiers');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].price_table.code).toBe('PT-001');
    expect(body.data[0].tiers).toHaveLength(2);
    expect(body.data[0].tiers[0].unit_price).toBe(100);
    expect(body.data[0].tiers[1].min_qty).toBe(500);
  });

  it('should return 404 for non-existent product', async () => {
    mockPriceTierQueries(null);

    const { GET } = await import('../../app/api/v1/pricing/products/[id]/price-tiers/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/pricing/products/999/price-tiers');

    const response = await GET(req, routeCtx({ id: '999' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return empty array when no tables', async () => {
    mockPriceTierQueries({ id: 42 }, []);

    const { GET } = await import('../../app/api/v1/pricing/products/[id]/price-tiers/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/pricing/products/42/price-tiers');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('should return 401 without widget token', async () => {
    const { GET } = await import('../../app/api/v1/pricing/products/[id]/price-tiers/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/pricing/products/42/price-tiers');

    const response = await GET(req, routeCtx({ id: '42' }));

    expect(response.status).toBe(401);
  });
});

// ─── GET /api/v1/pricing/products/:id/fixed-prices ───────────

describe('GET /api/v1/pricing/products/:id/fixed-prices', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFixedPriceQueries(
    product: Record<string, unknown> | null,
    fixedPriceRows: Record<string, unknown>[] = [],
  ) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // product lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(product ? [product] : []),
          }),
        };
      }
      // fixed prices query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(fixedPriceRows),
        }),
      };
    });
  }

  it('should return fixed prices for product', async () => {
    const rows = [
      {
        id: 1, sizeId: 10, paperId: 5, printModeId: 2,
        optionLabel: 'A4 / Art 250g / Double-sided',
        baseQty: 100, sellingPrice: '38060', vatIncluded: false,
      },
    ];
    mockFixedPriceQueries({ id: 42 }, rows);

    const { GET } = await import('../../app/api/v1/pricing/products/[id]/fixed-prices/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/pricing/products/42/fixed-prices');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].selling_price).toBe(38060);
    expect(body.data[0].size_id).toBe(10);
    expect(body.data[0].vat_included).toBe(false);
  });

  it('should return 404 for non-existent product', async () => {
    mockFixedPriceQueries(null);

    const { GET } = await import('../../app/api/v1/pricing/products/[id]/fixed-prices/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/pricing/products/999/fixed-prices');

    const response = await GET(req, routeCtx({ id: '999' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return empty array when no fixed prices', async () => {
    mockFixedPriceQueries({ id: 42 }, []);

    const { GET } = await import('../../app/api/v1/pricing/products/[id]/fixed-prices/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/pricing/products/42/fixed-prices');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});
