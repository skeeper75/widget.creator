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
  status: 'paid',
  totalPrice: '38060',
  currency: 'KRW',
  quoteData: {
    product_id: 42,
    size_id: 15,
    paper_id: 8,
    print_mode_id: 4,
    quantity: 500,
    calculated_price: 38060,
  },
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

describe('POST /api/v1/orders/:id/files', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFileUploadQueries(order: Record<string, unknown> | null) {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(order ? [order] : []),
        }),
      }),
    });

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    });
  }

  it('should return presigned upload URL for valid PDF', async () => {
    mockFileUploadQueries(MOCK_ORDER);

    const { POST } = await import('../../app/api/v1/orders/[id]/files/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'design.pdf',
        content_type: 'application/pdf',
        file_size: 15728640,
      }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveProperty('upload_url');
    expect(body.data).toHaveProperty('file_id');
    expect(body.data).toHaveProperty('file_number');
    expect(body.data).toHaveProperty('expires_at');
    expect(body.data.max_size).toBe(524_288_000);
    expect(body.data.upload_url).toContain('s3.example.com');
    expect(body.data.file_id).toMatch(/^file_/);
  });

  it('should return 404 for non-existent order', async () => {
    mockFileUploadQueries(null);

    const { POST } = await import('../../app/api/v1/orders/[id]/files/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_nonexist/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'design.pdf',
        content_type: 'application/pdf',
        file_size: 1000,
      }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_nonexist' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 422 for disallowed MIME type', async () => {
    const { POST } = await import('../../app/api/v1/orders/[id]/files/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'malware.exe',
        content_type: 'application/octet-stream',
        file_size: 1000,
      }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_abc123' }));

    expect(response.status).toBe(422);
  });

  it('should return 422 for file > 500MB', async () => {
    const { POST } = await import('../../app/api/v1/orders/[id]/files/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'huge.pdf',
        content_type: 'application/pdf',
        file_size: 600_000_000,
      }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_abc123' }));

    expect(response.status).toBe(422);
  });

  it('should accept image/jpeg uploads', async () => {
    mockFileUploadQueries(MOCK_ORDER);

    const { POST } = await import('../../app/api/v1/orders/[id]/files/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'photo.jpeg',
        content_type: 'image/jpeg',
        file_size: 5000000,
      }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.file_number).toContain('.jpeg');
  });

  it('should generate correct file number from order data', async () => {
    mockFileUploadQueries(MOCK_ORDER);

    const { POST } = await import('../../app/api/v1/orders/[id]/files/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'artwork.ai',
        content_type: 'application/postscript',
        file_size: 10000000,
      }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_abc123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    // file_number format: huniCode_productName_size_printMode_paper_company_customer_shopbyId_QQQQQea.ext
    expect(body.data.file_number).toContain('00500ea.ai');
    expect(body.data.file_number).toContain('Test Co');
    expect(body.data.file_number).toContain('Hong');
  });

  it('should return 422 for empty filename', async () => {
    const { POST } = await import('../../app/api/v1/orders/[id]/files/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_abc123/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: '',
        content_type: 'application/pdf',
        file_size: 1000,
      }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_abc123' }));

    expect(response.status).toBe(422);
  });
});
