import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockApiKey } from '../setup.js';

const API_KEY = createMockApiKey();

function authHeaders(): Record<string, string> {
  return { 'x-api-key': API_KEY };
}

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

const NOW = new Date('2026-02-22T10:00:00.000Z');

// ─── GET /api/v1/integration/shopby/products ─────────────────

describe('GET /api/v1/integration/shopby/products', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return shopby-linked products', async () => {
    const rows = [
      { product_id: 42, shopby_id: '30146712', name: 'Booklet', huni_code: '1001', is_active: true, updated_at: NOW },
    ];
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    });

    const { GET } = await import('../../app/api/v1/integration/shopby/products/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/shopby/products', {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].product_id).toBe(42);
    expect(body.data[0].sync_status).toBe('synced');
  });

  it('should return 401 without API key', async () => {
    const { GET } = await import('../../app/api/v1/integration/shopby/products/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/shopby/products');

    const response = await GET(req, routeCtx());

    expect(response.status).toBe(401);
  });
});

// ─── POST /api/v1/integration/shopby/orders ──────────────────

describe('POST /api/v1/integration/shopby/orders', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create shopby order', async () => {
    const { POST } = await import('../../app/api/v1/integration/shopby/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/shopby/orders', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: 'ord_test',
        shopby_product_id: 42,
        quantity: 100,
        customer_name: 'Hong',
        customer_email: 'hong@example.com',
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toHaveProperty('shopby_order_id');
    expect(body.data.order_id).toBe('ord_test');
    expect(body.data.status).toBe('created');
  });

  it('should return 422 for invalid body', async () => {
    const { POST } = await import('../../app/api/v1/integration/shopby/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/shopby/orders', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(422);
  });
});

// ─── GET /api/v1/integration/mes/items ───────────────────────

describe('GET /api/v1/integration/mes/items', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return MES items with options', async () => {
    const items = [
      { id: 1, itemCode: 'MES001', groupCode: 'GRP01', name: 'Paper', itemType: 'material' },
    ];
    const options = [
      { optionNumber: 1, optionValue: 'A4' },
    ];

    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // items
        return {
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(items),
          }),
        };
      }
      // options per item
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(options),
          }),
        }),
      };
    });

    const { GET } = await import('../../app/api/v1/integration/mes/items/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/mes/items', {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].item_code).toBe('MES001');
    expect(body.data[0].options).toHaveLength(1);
  });
});

// ─── GET /api/v1/integration/mes/mappings ────────────────────

describe('GET /api/v1/integration/mes/mappings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return product and choice mappings', async () => {
    const productMappings = [
      { id: 1, product_id: 42, product_name: 'Booklet', mes_item_id: 1, mes_item_code: 'MES001', cover_type: 'body', is_active: true },
    ];
    const choiceMappings = [
      { id: 1, option_choice_id: 100, option_choice_name: 'Art 250g', mes_item_id: 1, mes_code: 'MAT001', mapping_type: 'material', mapping_status: 'mapped' },
    ];

    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockResolvedValue(productMappings),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockResolvedValue(choiceMappings),
        }),
      };
    });

    const { GET } = await import('../../app/api/v1/integration/mes/mappings/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/mes/mappings', {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.product_mappings).toHaveLength(1);
    expect(body.data.choice_mappings).toHaveLength(1);
  });
});

// ─── POST /api/v1/integration/shopby/products/:id/sync ───────

describe('POST /api/v1/integration/shopby/products/:id/sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should sync product to shopby', async () => {
    const product = { id: 42, name: 'Booklet', shopbyId: '30146712' };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([product]),
      }),
    });

    const { POST } = await import('../../app/api/v1/integration/shopby/products/[id]/sync/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/shopby/products/42/sync', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sync_status).toBe('synced');
    expect(body.data.product_id).toBe(42);
  });

  it('should return 404 for non-existent product', async () => {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { POST } = await import('../../app/api/v1/integration/shopby/products/[id]/sync/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/shopby/products/999/sync', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req, routeCtx({ id: '999' }));

    expect(response.status).toBe(404);
  });
});

// ─── PUT /api/v1/integration/shopby/orders/:id/status ────────

describe('PUT /api/v1/integration/shopby/orders/:id/status', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should update shopby order status', async () => {
    const { PUT } = await import('../../app/api/v1/integration/shopby/orders/[id]/status/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/shopby/orders/SB-123/status', {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shipped', tracking_number: 'TRACK123' }),
    });

    const response = await PUT(req, routeCtx({ id: 'SB-123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.order_id).toBe('SB-123');
    expect(body.data.shopby_status).toBe('shipped');
    expect(body.data.tracking_number).toBe('TRACK123');
  });
});

// ─── POST /api/v1/integration/mes/orders/:id/dispatch ────────

describe('POST /api/v1/integration/mes/orders/:id/dispatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should dispatch order to MES', async () => {
    const { POST } = await import('../../app/api/v1/integration/mes/orders/[id]/dispatch/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/mes/orders/ord_test/dispatch', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ production_memo: 'Rush order' }),
    });

    const response = await POST(req, routeCtx({ id: 'ord_test' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.order_id).toBe('ord_test');
    expect(body.data.status).toBe('dispatched');
    expect(body.data.production_memo).toBe('Rush order');
    expect(body.data).toHaveProperty('mes_order_id');
  });
});

// ─── PUT /api/v1/integration/mes/orders/:id/status ───────────

describe('PUT /api/v1/integration/mes/orders/:id/status', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should receive MES status callback', async () => {
    const { PUT } = await import('../../app/api/v1/integration/mes/orders/[id]/status/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/mes/orders/ord_test/status', {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes_status: 'completed', barcode: 'BC123' }),
    });

    const response = await PUT(req, routeCtx({ id: 'ord_test' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.order_id).toBe('ord_test');
    expect(body.data.mes_status).toBe('completed');
    expect(body.data.barcode).toBe('BC123');
  });
});

// ─── GET /api/v1/integration/edicus/products ─────────────────

describe('GET /api/v1/integration/edicus/products', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return edicus-linked products', async () => {
    const mappings = [
      { product_id: 42, edicus_code: 'ED-001', editor_type: 'edicus', template_id: 'tmpl_001', editor_enabled: true },
    ];
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockResolvedValue(mappings),
      }),
    });

    const { GET } = await import('../../app/api/v1/integration/edicus/products/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/edicus/products', {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].product_id).toBe(42);
  });
});

// ─── GET /api/v1/integration/edicus/products/:id/config ──────

describe('GET /api/v1/integration/edicus/products/:id/config', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockConfigQueries(
    product: Record<string, unknown> | null,
    editorMapping: Record<string, unknown> | null = null,
    sizes: Record<string, unknown>[] = [],
    options: Record<string, unknown>[] = [],
  ) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(product ? [product] : []),
          }),
        };
      }
      if (selectCall === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(editorMapping ? [editorMapping] : []),
          }),
        };
      }
      if (selectCall === 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(sizes),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(options),
          }),
        }),
      };
    });
  }

  it('should return editor config with sizes and options', async () => {
    const product = { id: 42, name: 'Booklet', productType: 'booklet', editorEnabled: true };
    const mapping = { editorType: 'edicus', templateId: 'tmpl_001', templateConfig: { key: 'val' } };
    mockConfigQueries(product, mapping, [{ id: 1, code: 'A4' }], [{ id: 1, key: 'paper' }]);

    const { GET } = await import('../../app/api/v1/integration/edicus/products/[id]/config/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/edicus/products/42/config', {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.product.name).toBe('Booklet');
    expect(body.data.editor.editor_type).toBe('edicus');
    expect(body.data.sizes).toHaveLength(1);
    expect(body.data.options).toHaveLength(1);
  });

  it('should return 404 for non-existent product', async () => {
    mockConfigQueries(null);

    const { GET } = await import('../../app/api/v1/integration/edicus/products/[id]/config/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/edicus/products/999/config', {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx({ id: '999' }));

    expect(response.status).toBe(404);
  });
});

// ─── GET /api/v1/integration/edicus/designs/:id ──────────────

describe('GET /api/v1/integration/edicus/designs/:id', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 404 for non-existent design', async () => {
    const { GET } = await import('../../app/api/v1/integration/edicus/designs/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/edicus/designs/des_nonexist', {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx({ id: 'des_nonexist' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return design detail after creation', async () => {
    // First, create a design via POST
    const { POST } = await import('../../app/api/v1/integration/edicus/designs/route.js');
    const createReq = new NextRequest('http://localhost:3000/api/v1/integration/edicus/designs', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: 'ord_detail_test',
        template_id: 'tmpl_002',
        render_data: { text: 'Test' },
        output_url: 'https://s3.example.com/detail.pdf',
      }),
    });

    const createRes = await POST(createReq, routeCtx());
    const createBody = await createRes.json();
    const designId = createBody.data.design_id;

    // Then, fetch the created design by ID
    const { GET } = await import('../../app/api/v1/integration/edicus/designs/[id]/route.js');
    const req = new NextRequest(`http://localhost:3000/api/v1/integration/edicus/designs/${designId}`, {
      headers: authHeaders(),
    });

    const response = await GET(req, routeCtx({ id: designId }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(designId);
    expect(body.data.order_id).toBe('ord_detail_test');
    expect(body.data.template_id).toBe('tmpl_002');
    expect(body.data.status).toBe('rendering');
    expect(body.data.output_url).toBe('https://s3.example.com/detail.pdf');
  });
});

// ─── POST /api/v1/integration/edicus/designs ─────────────────

describe('POST /api/v1/integration/edicus/designs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create edicus design', async () => {
    const { POST } = await import('../../app/api/v1/integration/edicus/designs/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/edicus/designs', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: 'ord_test',
        template_id: 'tmpl_001',
        render_data: { text: 'Hello' },
        output_url: 'https://s3.example.com/output.pdf',
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toHaveProperty('design_id');
    expect(body.data.status).toBe('rendering');
  });

  it('should return 422 for invalid body', async () => {
    const { POST } = await import('../../app/api/v1/integration/edicus/designs/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/integration/edicus/designs', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(422);
  });
});
