import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';

// Mock withAdminAuth to bypass the missing auth.js dependency
vi.mock('../../app/api/_lib/middleware/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/api/_lib/middleware/auth.js')>();
  return {
    ...actual,
    withAdminAuth: () => {
      return async (_req: unknown, ctx: Record<string, unknown>) => {
        ctx.session = {
          user: { id: 'admin_001', email: 'admin@huni.co.kr', role: 'ADMIN' },
        };
      };
    },
  };
});

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

const NOW = new Date('2026-02-22T10:00:00.000Z');

const MOCK_ORDER = {
  id: 1,
  orderId: 'ord_abc123',
  orderNumber: 'HN-20260222-0001',
  status: 'unpaid',
  totalPrice: '38060',
  currency: 'KRW',
  quoteData: { product_id: 42, calculated_price: 38060 },
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
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_HISTORY = [
  { status: 'unpaid', changedAt: NOW, memo: null },
];

const MOCK_FILES = [
  {
    fileId: 'file_abc123',
    originalName: 'design.pdf',
    fileNumber: '0042_product_A4_D_art250_TestCo_hong_00000000_00500ea.pdf',
    fileSize: 1500000,
    mimeType: 'application/pdf',
    status: 'pending',
    uploadedAt: NOW,
  },
];

// ─── GET /api/v1/orders/:id ──────────────────────────────────

describe('GET /api/v1/orders/:id', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockDetailQueries(
    order: Record<string, unknown> | null,
    history: Record<string, unknown>[] = [],
    files: Record<string, unknown>[] = [],
  ) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // order lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(order ? [order] : []),
            }),
          }),
        };
      }
      if (selectCall === 2) {
        // status history
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(history),
          }),
        };
      }
      // design files
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(files),
        }),
      };
    });
  }

  it('should return order detail with history and files', async () => {
    mockDetailQueries(MOCK_ORDER, MOCK_HISTORY, MOCK_FILES);

    const { GET } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123');

    const response = await GET(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe('ord_abc123');
    expect(body.data.order_number).toBe('HN-20260222-0001');
    expect(body.data.status).toBe('unpaid');
    expect(body.data.total_price).toBe(38060);
    expect(body.data.customer).toEqual({
      name: 'Hong',
      email: 'hong@example.com',
      phone: '010-1234-5678',
      company: 'Test Co',
    });
    expect(body.data.shipping.method).toBe('delivery');
    expect(body.data.design_files).toHaveLength(1);
    expect(body.data.design_files[0].id).toBe('file_abc123');
    expect(body.data.status_history).toHaveLength(1);
    expect(body.data.status_history[0].status).toBe('unpaid');
  });

  it('should return 404 for non-existent order', async () => {
    mockDetailQueries(null);

    const { GET } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_nonexist');

    const response = await GET(req, routeCtx({ id: 'ord_nonexist' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return empty arrays when no history or files', async () => {
    mockDetailQueries(MOCK_ORDER, [], []);

    const { GET } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123');

    const response = await GET(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.design_files).toEqual([]);
    expect(body.data.status_history).toEqual([]);
  });
});

// ─── PATCH /api/v1/orders/:id ────────────────────────────────

describe('PATCH /api/v1/orders/:id', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockPatchQueries(
    order: Record<string, unknown> | null,
    updatedOrder?: Record<string, unknown>,
  ) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(order ? [order] : []),
          }),
        }),
      };
    });

    if (updatedOrder) {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedOrder]),
          }),
        }),
      });

      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });
    }
  }

  it('should update order status (unpaid -> paid)', async () => {
    const updatedOrder = { ...MOCK_ORDER, status: 'paid', updatedAt: new Date() };
    mockPatchQueries(MOCK_ORDER, updatedOrder);

    const { PATCH } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });

    const response = await PATCH(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('paid');
  });

  it('should reject invalid state transition (unpaid -> shipped)', async () => {
    mockPatchQueries(MOCK_ORDER);

    const { PATCH } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shipped' }),
    });

    const response = await PATCH(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.type).toContain('state-transition');
  });

  it('should return 404 for non-existent order', async () => {
    mockPatchQueries(null);

    const { PATCH } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_nonexist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });

    const response = await PATCH(req, routeCtx({ id: 'ord_nonexist' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should accept status update with tracking number', async () => {
    const shippedOrder = {
      ...MOCK_ORDER,
      status: 'production_done',
    };
    const updatedOrder = {
      ...shippedOrder,
      status: 'shipped',
      shippingTrackingNumber: 'TRACK123',
      updatedAt: new Date(),
    };
    mockPatchQueries(shippedOrder, updatedOrder);

    const { PATCH } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'shipped',
        tracking_number: 'TRACK123',
      }),
    });

    const response = await PATCH(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('shipped');
  });

  it('should return 422 for invalid status value', async () => {
    const { PATCH } = await import('../../app/api/v1/orders/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'flying' }),
    });

    const response = await PATCH(req, routeCtx({ id: 'ord_abc123' }));

    expect(response.status).toBe(422);
  });
});
