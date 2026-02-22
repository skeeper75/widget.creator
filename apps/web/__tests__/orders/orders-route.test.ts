import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';

// Mock verifyAdminSession to bypass the missing auth.js dependency
vi.mock('../../app/api/_lib/middleware/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/api/_lib/middleware/auth.js')>();
  return {
    ...actual,
    withAdminAuth: (roles?: string[]) => {
      return async (_req: unknown, ctx: Record<string, unknown>) => {
        const session = (ctx as Record<string, unknown>).__mockAdminSession;
        if (!session) {
          // Default admin session for tests
          ctx.session = {
            user: { id: 'admin_001', email: 'admin@huni.co.kr', role: 'ADMIN' },
          };
        }
        if (roles && roles.length > 0) {
          const user = (ctx.session as { user: { role: string } }).user;
          if (!roles.includes(user.role)) {
            const { forbidden } = await import('../../app/api/_lib/middleware/error-handler.js');
            throw forbidden(`Role '${user.role}' does not have access`);
          }
        }
      };
    },
  };
});

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

const NOW = new Date('2026-02-22T10:00:00.000Z');

const MOCK_ORDER_ROW = {
  id: 1,
  orderId: 'ord_abc123def456',
  orderNumber: 'HN-20260222-0001',
  status: 'unpaid',
  totalPrice: '38060',
  currency: 'KRW',
  quoteData: { product_id: 42, size_id: 15, paper_id: 8, calculated_price: 38060 },
  customerName: 'Hong',
  customerEmail: 'hong@example.com',
  customerPhone: '010-1234-5678',
  customerCompany: 'Test Co',
  shippingMethod: 'delivery',
  shippingAddress: 'Seoul',
  shippingPostalCode: '06142',
  shippingMemo: null,
  shippingTrackingNumber: null,
  shippingEstimatedDate: null,
  widgetId: 'wgt_test',
  productId: 42,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

// ─── POST /api/v1/orders ─────────────────────────────────────

describe('POST /api/v1/orders', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockInsertReturning(row: Record<string, unknown>) {
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([row]),
      }),
    });
  }

  function mockInsertChain(orderRow: Record<string, unknown>) {
    let insertCall = 0;
    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      insertCall++;
      if (insertCall === 1) {
        // orders insert
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([orderRow]),
          }),
        };
      }
      // status history insert
      return {
        values: vi.fn().mockResolvedValue([]),
      };
    });
  }

  it('should create an order and return 201', async () => {
    mockInsertChain(MOCK_ORDER_ROW);

    const { POST } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_data: {
          product_id: 42,
          size_id: 15,
          paper_id: 8,
          print_mode_id: 4,
          quantity: 500,
          page_count: 100,
          calculated_price: 38060,
          breakdown: { print_cost: 15000, paper_cost: 8500 },
        },
        customer: {
          name: 'Hong',
          email: 'hong@example.com',
          phone: '010-1234-5678',
          company: 'Test Co',
        },
        shipping: {
          method: 'delivery',
          address: 'Seoul',
          postal_code: '06142',
        },
        widget_id: 'wgt_test',
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('order_number');
    expect(body.data.status).toBe('unpaid');
    expect(body.data.total_price).toBe(38060);
  });

  it('should return 422 for invalid body', async () => {
    const { POST } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.type).toContain('validation');
  });

  it('should return 422 for negative quantity', async () => {
    const { POST } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_data: {
          product_id: 42,
          size_id: 15,
          paper_id: 8,
          print_mode_id: 4,
          quantity: -5,
          page_count: 100,
          calculated_price: 38060,
          breakdown: {},
        },
        customer: {
          name: 'Hong',
          email: 'hong@example.com',
          phone: '010-1234-5678',
        },
        shipping: { method: 'delivery', address: 'Seoul', postal_code: '06142' },
      }),
    });

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(422);
  });
});

// ─── GET /api/v1/orders ──────────────────────────────────────

describe('GET /api/v1/orders', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockListQueries(totalCount: number, rows: Record<string, unknown>[]) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // count query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: totalCount }]),
          }),
        };
      }
      // data query with chained orderBy, offset, limit
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              offset: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(rows),
              }),
            }),
          }),
        }),
      };
    });
  }

  it('should return paginated order list', async () => {
    mockListQueries(1, [MOCK_ORDER_ROW]);

    const { GET } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body).toHaveProperty('links');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe('ord_abc123def456');
    expect(body.data[0].status).toBe('unpaid');
  });

  it('should mask customer phone in list response', async () => {
    mockListQueries(1, [MOCK_ORDER_ROW]);

    const { GET } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(body.data[0].customer.phone).toBe('010-****-5678');
  });

  it('should return empty collection when no orders', async () => {
    mockListQueries(0, []);

    const { GET } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('should pass pagination params', async () => {
    mockListQueries(50, [MOCK_ORDER_ROW]);

    const { GET } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders?page=2&limit=10');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.page).toBe(2);
    expect(body.meta.limit).toBe(10);
    expect(body.meta.total).toBe(50);
    expect(body.meta.total_pages).toBe(5);
  });

  it('should accept date_to filter', async () => {
    mockListQueries(1, [MOCK_ORDER_ROW]);

    const { GET } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders?date_to=2026-12-31');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('should sort by total_price', async () => {
    mockListQueries(1, [MOCK_ORDER_ROW]);

    const { GET } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders?sort=total_price&order=asc');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
  });

  it('should sort by order_number', async () => {
    mockListQueries(1, [MOCK_ORDER_ROW]);

    const { GET } = await import('../../app/api/v1/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders?sort=order_number');

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
  });
});
