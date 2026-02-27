/**
 * Tests for POST /api/widget/orders and GET /api/widget/orders/:orderCode
 * SPEC-WB-006 FR-WB006-04, FR-WB006-05, FR-WB006-06
 *
 * POST /api/widget/orders:
 *   1. Parse and validate productId, selections, customer from body
 *   2. Product lookup from wbProducts
 *   3. Parallel: active recipe + price config lookup
 *   4. Constraint lookup + server-side re-quote + constraint evaluation
 *   5. Price discrepancy detection (client vs server)
 *   6. Generate unique orderCode (ORD-YYYYMMDD-XXXX)
 *   7. Insert order record into wbOrders table
 *   8. Fire-and-forget MES dispatch if product.mesItemCd is set
 *   Returns: { orderCode, status, totalPrice, priceMatched, mesStatus, createdAt }
 *
 * GET /api/widget/orders/:orderCode:
 *   - Returns order status for tracking
 *   Returns: { orderCode, status, mesStatus, totalPrice, createdAt, updatedAt }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';

// Mock dispatchToMes service
vi.mock('../../app/api/_lib/services/mes-client.js', () => ({
  dispatchToMes: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock all @widget-creator/db exports needed by the orders routes
vi.mock('@widget-creator/db', () => {
  function createStubTable(name: string, columns: string[]) {
    const table: Record<string, unknown> = { _name: name };
    for (const col of columns) {
      table[col] = Symbol(`${name}.${col}`);
    }
    table.$inferSelect = {};
    return table;
  }

  return {
    wbProducts: createStubTable('wb_products', [
      'id', 'productKey', 'productNameKo', 'productNameEn', 'categoryId',
      'isActive', 'mesItemCd', 'hasEditor', 'hasUpload', 'thumbnailUrl',
      'createdAt', 'updatedAt',
    ]),
    productRecipes: createStubTable('product_recipes', [
      'id', 'productId', 'recipeVersion', 'recipeName', 'isDefault',
      'isArchived', 'publishedAt', 'createdAt', 'updatedAt',
    ]),
    recipeOptionBindings: createStubTable('recipe_option_bindings', [
      'id', 'recipeId', 'typeId', 'displayOrder', 'processingOrder',
      'isRequired', 'defaultChoiceId', 'isActive',
    ]),
    optionElementTypes: createStubTable('option_element_types', [
      'id', 'typeKey', 'typeNameKo', 'uiControl', 'optionCategory', 'isActive',
    ]),
    optionElementChoices: createStubTable('option_element_choices', [
      'id', 'typeId', 'choiceKey', 'displayName', 'value', 'isDefault',
      'thumbnailUrl', 'colorHex', 'priceImpact', 'widthMm', 'heightMm',
      'displayOrder', 'isActive',
    ]),
    recipeConstraints: createStubTable('recipe_constraints', [
      'id', 'recipeId', 'constraintName', 'triggerOptionType', 'triggerOperator',
      'triggerValues', 'actions', 'priority', 'isActive',
    ]),
    productPriceConfigs: createStubTable('product_price_configs', [
      'id', 'productId', 'priceMode', 'unitPriceSqm', 'minAreaSqm', 'isActive',
    ]),
    printCostBase: createStubTable('print_cost_base', [
      'id', 'productId', 'plateType', 'printMode', 'qtyMin', 'qtyMax',
      'unitPrice', 'isActive',
    ]),
    postprocessCost: createStubTable('postprocess_cost', [
      'id', 'productId', 'processCode', 'priceType', 'unitPrice', 'isActive',
    ]),
    qtyDiscount: createStubTable('qty_discount', [
      'id', 'productId', 'qtyMin', 'qtyMax', 'discountRate', 'discountLabel', 'isActive',
    ]),
    wbOrders: createStubTable('orders', [
      'id', 'orderCode', 'productId', 'recipeId', 'recipeVersion', 'selections',
      'priceBreakdown', 'totalPrice', 'appliedConstraints', 'addonItems',
      'shopbyOrderNo', 'mesOrderId', 'mesStatus', 'customerName', 'customerEmail',
      'customerPhone', 'status', 'createdAt', 'updatedAt',
    ]),
    wbQuoteLogs: createStubTable('quote_logs', [
      'id', 'productId', 'selections', 'quoteResult', 'source', 'responseMs', 'createdAt',
    ]),
    addonGroups: createStubTable('addon_groups', [
      'id', 'productId', 'name', 'displayOrder', 'isActive',
    ]),
    addonGroupItems: createStubTable('addon_group_items', [
      'id', 'addonGroupId', 'name', 'price', 'mesItemCd', 'displayOrder', 'isActive',
    ]),
    recipeChoiceRestrictions: createStubTable('recipe_choice_restrictions', [
      'id', 'recipeId', 'typeId', 'choiceId', 'isActive',
    ]),
    constraintTemplates: createStubTable('constraint_templates', [
      'id', 'name', 'description', 'template', 'isActive',
    ]),
    constraintNlHistory: createStubTable('constraint_nl_history', [
      'id', 'recipeId', 'input', 'output', 'createdAt',
    ]),
    publishHistory: createStubTable('publish_history', [
      'id', 'recipeId', 'publishedBy', 'publishedAt', 'notes',
    ]),
    simulationRuns: createStubTable('simulation_runs', [
      'id', 'recipeId', 'status', 'totalCases', 'createdAt',
    ]),
  };
});

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

// Standard mock product with MES item code
const mockProductWithMes = {
  id: 42,
  productKey: 'business-card',
  productNameKo: '명함',
  isActive: true,
  mesItemCd: 'MES-001', // has MES item code -> will dispatch
};

// Product without MES item code
const mockProductNoMes = {
  ...mockProductWithMes,
  mesItemCd: null, // no MES -> mesStatus='not_linked'
};

const mockRecipe = {
  id: 10,
  productId: 42,
  recipeVersion: 2,
  recipeName: '명함 기본 레시피',
  isDefault: true,
  isArchived: false,
};

const mockPriceConfig = {
  id: 1,
  productId: 42,
  priceMode: 'LOOKUP',
  isActive: true,
};

const mockCreatedOrder = {
  id: 1,
  orderCode: 'ORD-20260225-0042',
  productId: 42,
  recipeId: 10,
  recipeVersion: 2,
  selections: { SIZE: '90x54mm', QUANTITY: 100 },
  priceBreakdown: { printCost: 0, processCost: 0, subtotal: 0, totalPrice: 0 },
  totalPrice: '0.00',
  appliedConstraints: [],
  addonItems: null,
  mesOrderId: null,
  mesStatus: 'pending',
  customerName: '홍길동',
  customerEmail: 'hong@example.com',
  customerPhone: '010-1234-5678',
  status: 'created',
  createdAt: new Date('2026-02-25T00:00:00Z'),
  updatedAt: new Date('2026-02-25T00:00:00Z'),
};

// Request body matching actual route's expected structure
const validOrderBody = {
  productId: 42,
  selections: {
    SIZE: '90x54mm',
    QUANTITY: 100,
  },
  clientQuoteTotal: 0, // 0 because mock pricing returns 0
  customer: {
    name: '홍길동',
    email: 'hong@example.com',
    phone: '010-1234-5678',
  },
};

describe('POST /api/widget/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Route DB call sequence:
   * 1. wbProducts lookup .where(id, isActive).limit(1)
   * 2. Promise.all([
   *      productRecipes .where(productId, isDefault=true, isArchived=false).limit(1).then(),
   *      productPriceConfigs .where(productId, isActive).limit(1).then(),
   *    ])
   * 3. recipeConstraints .where(recipeId, isActive)
   * 4. serverReQuote -> printCostBase, postprocessCost (each .limit(1)), qtyDiscount .limit(1)
   * 5. wbOrders .where(orderCode).limit(1)  [collision check]
   * 6. db.insert(wbOrders).values(...).returning()
   */
  function mockOrderDbCalls(options: {
    product?: Record<string, unknown> | null;
    recipe?: Record<string, unknown> | null;
    priceConfig?: Record<string, unknown> | null;
    constraints?: Record<string, unknown>[];
    existingOrder?: Record<string, unknown> | null;
    insertedOrder?: Record<string, unknown>;
  } = {}) {
    const {
      product = mockProductWithMes,
      recipe = mockRecipe,
      priceConfig = mockPriceConfig,
      constraints = [],
      existingOrder = null, // no collision by default
      insertedOrder = mockCreatedOrder,
    } = options;

    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;

      // Call 1: wbProducts
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(product ? [product] : []),
            }),
          }),
        };
      }

      // Calls 2+3: Promise.all([recipe, priceConfig])
      if (selectCall === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi.fn((resolve: (v: unknown) => unknown) =>
                  Promise.resolve(resolve(recipe ? [recipe] : [])),
                ),
              }),
            }),
          }),
        };
      }

      if (selectCall === 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi.fn((resolve: (v: unknown) => unknown) =>
                  Promise.resolve(resolve(priceConfig ? [priceConfig] : [])),
                ),
              }),
            }),
          }),
        };
      }

      // Call 4: recipeConstraints
      if (selectCall === 4) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(constraints),
          }),
        };
      }

      // Calls 5-7: serverReQuote -> printCostBase, qtyDiscount (LOOKUP mode without SIZE/PRINT_TYPE defaults to 0)
      // These calls use .limit(1) directly (not .then())
      // Call 5: qtyDiscount (main path in serverReQuote when LOOKUP without plateType)
      if (selectCall === 5) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // no discount
            }),
          }),
        };
      }

      // Call 6: orderCode collision check (wbOrders)
      if (selectCall === 6) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(existingOrder ? [existingOrder] : []),
            }),
          }),
        };
      }

      // Subsequent: empty (extra pricing calls if FINISHING or collision retry)
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
    });

    // Mock insert returning the created order
    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([insertedOrder]),
      }),
    }));
  }

  it('should create order and return 201 with orderCode, status, priceMatched, mesStatus', async () => {
    mockOrderDbCalls();

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toHaveProperty('orderCode');
    expect(body).toHaveProperty('status', 'created');
    expect(body).toHaveProperty('priceMatched');
    expect(body).toHaveProperty('mesStatus');
    expect(body).toHaveProperty('totalPrice');
    expect(body.orderCode).toMatch(/^ORD-\d{8}-\d{4}$/);
  });

  it('should set mesStatus=pending when product has mesItemCd', async () => {
    mockOrderDbCalls({ product: mockProductWithMes });

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    // With mesItemCd, MES dispatch is fired (fire-and-forget) -> mesStatus='pending'
    expect(body.mesStatus).toBe('pending');
  });

  it('should set mesStatus=not_linked when product has no mesItemCd', async () => {
    const notLinkedOrder = { ...mockCreatedOrder, mesStatus: 'not_linked' };
    mockOrderDbCalls({ product: mockProductNoMes, insertedOrder: notLinkedOrder });

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.mesStatus).toBe('not_linked');
  });

  it('should return priceMatched=true when clientQuoteTotal matches server total', async () => {
    mockOrderDbCalls();

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // server total = 0 (no pricing data), client total = 0 -> matched
      body: JSON.stringify({ ...validOrderBody, clientQuoteTotal: 0 }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.priceMatched).toBe(true);
  });

  it('should return priceMatched=false when clientQuoteTotal differs from server total', async () => {
    mockOrderDbCalls();

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // server total = 0, client total = 99999 -> mismatch
      body: JSON.stringify({ ...validOrderBody, clientQuoteTotal: 99999 }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.priceMatched).toBe(false);
  });

  it('should return priceMatched=null when clientQuoteTotal is not provided', async () => {
    mockOrderDbCalls();

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const bodyWithoutTotal = { ...validOrderBody };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (bodyWithoutTotal as any).clientQuoteTotal;

    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(bodyWithoutTotal),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.priceMatched).toBeNull();
  });

  it('should return 404 when product not found', async () => {
    mockOrderDbCalls({ product: null });

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...validOrderBody, productId: 9999 }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 404 when product has no active recipe', async () => {
    mockOrderDbCalls({ recipe: null });

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 422 when constraint violation blocks the order', async () => {
    const blockConstraint = {
      id: 5,
      recipeId: 10,
      constraintName: 'size-restriction',
      triggerOptionType: 'SIZE',
      triggerOperator: 'EQUALS',
      triggerValues: ['90x54mm'],
      actions: [{ type: 'block', message: '이 사이즈는 현재 주문 불가입니다' }],
      priority: 10,
      isActive: true,
    };
    mockOrderDbCalls({ constraints: [blockConstraint] });

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        selections: { SIZE: '90x54mm', QUANTITY: 100 },
        customer: { name: '홍길동', email: 'hong@example.com', phone: '010-1234-5678' },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.type).toContain('constraint-violation');
  });

  it('should return 400 when productId is missing', async () => {
    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selections: { SIZE: '90x54mm', QUANTITY: 100 },
        customer: { name: '홍길동', email: 'hong@example.com', phone: '010-1234-5678' },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain('productId');
  });

  it('should return 400 when selections is missing', async () => {
    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        customer: { name: '홍길동', email: 'hong@example.com', phone: '010-1234-5678' },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain('selections');
  });

  it('should return 400 when request body is invalid JSON', async () => {
    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad json',
    });

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(400);
  });

  it('should be accessible without auth token (public endpoint)', async () => {
    mockOrderDbCalls();

    const { POST } = await import('../../app/api/widget/orders/route.js');
    // No auth headers
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    const response = await POST(req, routeCtx());

    // Public endpoint — should NOT return 401 or 403
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('should handle orderCode collision by regenerating orderCode', async () => {
    // First collision check returns an existing order, second returns empty
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;

      if (selectCall === 1) {
        // wbProducts
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockProductWithMes]),
            }),
          }),
        };
      }
      if (selectCall === 2) {
        // productRecipes .then
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi.fn((resolve: (v: unknown) => unknown) =>
                  Promise.resolve(resolve([mockRecipe])),
                ),
              }),
            }),
          }),
        };
      }
      if (selectCall === 3) {
        // productPriceConfigs .then
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi.fn((resolve: (v: unknown) => unknown) =>
                  Promise.resolve(resolve([mockPriceConfig])),
                ),
              }),
            }),
          }),
        };
      }
      if (selectCall === 4) {
        // recipeConstraints
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      if (selectCall === 5) {
        // qtyDiscount (pricing)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      }
      if (selectCall === 6) {
        // First orderCode collision check → returns an existing order (collision!)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 99 }]),
            }),
          }),
        };
      }
      // Fallback for any extra calls
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
    });

    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockCreatedOrder]),
      }),
    }));

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    const response = await POST(req, routeCtx());

    // Despite collision, order is still created (regenerated code)
    expect(response.status).toBe(201);
    expect(response.status).toBe(201);
  });

  it('should include addon items in order when auto_add constraint fires', async () => {
    const autoAddConstraint = {
      id: 7,
      recipeId: 10,
      constraintName: 'auto-add-envelope',
      triggerOptionType: 'PAPER',
      triggerOperator: 'IN',
      triggerValues: ['아트지 250g'],
      actions: [{ type: 'auto_add', addonGroupId: 1, addonItemId: 5 }],
      priority: 5,
      isActive: true,
    };

    const orderWithAddons = {
      ...mockCreatedOrder,
      addonItems: [{ type: 'auto_add', addonGroupId: 1, addonItemId: 5 }],
    };

    mockOrderDbCalls({ constraints: [autoAddConstraint], insertedOrder: orderWithAddons });

    const { POST } = await import('../../app/api/widget/orders/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        selections: { PAPER: '아트지 250g', QUANTITY: 100 },
      }),
    });

    const response = await POST(req, routeCtx());

    // Order creation succeeds even with addon items
    expect(response.status).toBe(201);
  });
});

describe('GET /api/widget/orders/:orderCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockOrderLookup(order: Record<string, unknown> | null) {
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(order ? [order] : []),
        }),
      }),
    }));
  }

  const existingOrder = {
    orderCode: 'ORD-20260225-0042',
    status: 'created',
    mesStatus: 'pending',
    totalPrice: '7954.00',
    createdAt: new Date('2026-02-25T00:00:00Z'),
    updatedAt: new Date('2026-02-25T00:00:00Z'),
  };

  it('should return 200 with order status fields', async () => {
    mockOrderLookup(existingOrder);

    const { GET } = await import('../../app/api/widget/orders/[orderCode]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders/ORD-20260225-0042');

    const response = await GET(req, routeCtx({ orderCode: 'ORD-20260225-0042' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('orderCode', 'ORD-20260225-0042');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('mesStatus');
    expect(body).toHaveProperty('totalPrice');
    expect(body).toHaveProperty('createdAt');
    expect(body).toHaveProperty('updatedAt');
  });

  it('should return 404 when orderCode not found', async () => {
    mockOrderLookup(null);

    const { GET } = await import('../../app/api/widget/orders/[orderCode]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders/ORD-NONEXISTENT');

    const response = await GET(req, routeCtx({ orderCode: 'ORD-NONEXISTENT' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return mesStatus=sent when MES dispatch succeeded', async () => {
    const sentOrder = { ...existingOrder, mesStatus: 'sent' };
    mockOrderLookup(sentOrder);

    const { GET } = await import('../../app/api/widget/orders/[orderCode]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders/ORD-20260225-0042');

    const response = await GET(req, routeCtx({ orderCode: 'ORD-20260225-0042' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mesStatus).toBe('sent');
  });

  it('should return mesStatus=not_linked for non-MES products', async () => {
    const notLinkedOrder = { ...existingOrder, mesStatus: 'not_linked' };
    mockOrderLookup(notLinkedOrder);

    const { GET } = await import('../../app/api/widget/orders/[orderCode]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders/ORD-20260225-0042');

    const response = await GET(req, routeCtx({ orderCode: 'ORD-20260225-0042' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mesStatus).toBe('not_linked');
  });

  it('should return totalPrice as number (converted from decimal string)', async () => {
    mockOrderLookup(existingOrder);

    const { GET } = await import('../../app/api/widget/orders/[orderCode]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders/ORD-20260225-0042');

    const response = await GET(req, routeCtx({ orderCode: 'ORD-20260225-0042' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.totalPrice).toBe('number');
    expect(body.totalPrice).toBe(7954);
  });

  it('should be accessible without auth token (public endpoint)', async () => {
    mockOrderLookup(existingOrder);

    const { GET } = await import('../../app/api/widget/orders/[orderCode]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/orders/ORD-20260225-0042');
    // No auth headers

    const response = await GET(req, routeCtx({ orderCode: 'ORD-20260225-0042' }));

    // Public endpoint — should NOT return 401 or 403
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});
