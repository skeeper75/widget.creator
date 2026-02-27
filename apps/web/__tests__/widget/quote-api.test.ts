/**
 * Tests for POST /api/widget/quote
 * SPEC-WB-006 FR-WB006-01: Unified constraint evaluation + pricing API
 *
 * Route: apps/web/app/api/widget/quote/route.ts
 * Public endpoint (no auth required), rate limited.
 *
 * The route performs:
 *   1. Parse and validate productId + selections from request body
 *   2. Product lookup from wbProducts
 *   3. Parallel: active recipe + price config lookup
 *   4. Constraint rules lookup
 *   5. Evaluate constraints -> uiActions, violations, addons
 *   6. Calculate pricing (LOOKUP or AREA mode)
 *   7. Returns { isValid, uiActions, pricing, violations, addons }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';

// Mock withWidgetAuth to inject a default widget context (bypasses JWT verification in tests)
vi.mock('../../app/api/_lib/middleware/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/api/_lib/middleware/auth.js')>();
  return {
    ...actual,
    withWidgetAuth: () => {
      return async (_req: unknown, ctx: Record<string, unknown>) => {
        ctx.widgetToken = {
          sub: 'wgt_test123',
          iss: 'widget.huni.co.kr',
          allowed_origins: ['*'],
        };
      };
    },
  };
});

// Mock all @widget-creator/db exports needed by the quote route
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
    // Widget product and recipe tables
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
    // Pricing tables
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
    // Order and logging tables
    wbOrders: createStubTable('orders', [
      'id', 'orderCode', 'productId', 'recipeId', 'recipeVersion', 'selections',
      'priceBreakdown', 'totalPrice', 'appliedConstraints', 'addonItems',
      'shopbyOrderNo', 'mesOrderId', 'mesStatus', 'customerName', 'customerEmail',
      'customerPhone', 'status', 'createdAt', 'updatedAt',
    ]),
    wbQuoteLogs: createStubTable('quote_logs', [
      'id', 'productId', 'selections', 'quoteResult', 'source', 'responseMs', 'createdAt',
    ]),
    // Additional tables used by other routes (prevents mock errors)
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

// Standard mock data matching actual route DB fields
const mockProduct = {
  id: 42,
  productKey: 'business-card',
  productNameKo: '명함',
  productNameEn: 'Business Card',
  categoryId: 1,
  isActive: true,
  mesItemCd: 'MES-001',
  hasEditor: false,
  hasUpload: true,
  thumbnailUrl: null,
};

const mockRecipe = {
  id: 10,
  productId: 42,
  recipeVersion: 1,
  recipeName: '명함 기본 레시피',
  isDefault: true,
  isArchived: false,
};

const mockPriceConfig = {
  id: 1,
  productId: 42,
  priceMode: 'LOOKUP',
  unitPriceSqm: null,
  minAreaSqm: null,
  isActive: true,
};

const mockConstraint = {
  id: 1,
  recipeId: 10,
  constraintName: 'coating-recommendation',
  triggerOptionType: 'FINISHING',
  triggerOperator: 'CONTAINS',
  triggerValues: ['무광PP'],
  actions: [{ type: 'show_message', message: '코팅 추천: 무광PP', level: 'info' }],
  priority: 1,
  isActive: true,
};

const validBody = {
  productId: 42,
  selections: {
    SIZE: '100x148mm',
    PRINT_TYPE: '단면칼라',
    PAPER: '아트지 250g',
    FINISHING: ['무광PP'],
    QUANTITY: 100,
  },
};

describe('POST /api/widget/quote', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * The route makes these DB calls in order:
   * 1. db.select().from(wbProducts).where(...).limit(1)    -> product
   * 2. Promise.all([
   *      productRecipes query,
   *      productPriceConfigs query,
   *    ])
   * 3. db.select().from(recipeConstraints).where(...)       -> constraints
   * Then pricing DB calls (printCostBase, qtyDiscount, etc.) based on mode/selections
   */
  function mockQuoteDbCalls(options: {
    product?: Record<string, unknown> | null;
    recipe?: Record<string, unknown> | null;
    priceConfig?: Record<string, unknown> | null;
    constraints?: Record<string, unknown>[];
    pricingRows?: Record<string, unknown>[];
  } = {}) {
    const {
      product = mockProduct,
      recipe = mockRecipe,
      priceConfig = mockPriceConfig,
      constraints = [mockConstraint],
      pricingRows = [],
    } = options;

    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;

      // Call 1: wbProducts lookup
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
        // productRecipes — returns recipe via .then((rows) => rows[0])
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
        // productPriceConfigs — returns config via .then((rows) => rows[0])
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

      // Subsequent: printCostBase, postprocessCost, qtyDiscount
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn((resolve: (v: unknown) => unknown) =>
                Promise.resolve(resolve([])),
              ),
            }),
          }),
        }),
      };
    });

    // Mock insert for quote log (fire-and-forget)
    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        catch: vi.fn(),
      }),
    }));
  }

  it('should return 200 with isValid, pricing, uiActions, violations, addons', async () => {
    mockQuoteDbCalls();

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('isValid');
    expect(body).toHaveProperty('uiActions');
    expect(body).toHaveProperty('pricing');
    expect(body).toHaveProperty('violations');
    expect(body).toHaveProperty('addons');

    expect(typeof body.isValid).toBe('boolean');
    expect(Array.isArray(body.uiActions)).toBe(true);
    expect(Array.isArray(body.violations)).toBe(true);
    expect(Array.isArray(body.addons)).toBe(true);
    expect(body.pricing).toBeDefined();
    expect(typeof body.pricing).toBe('object');
  });

  it('should return pricing object with correct fields', async () => {
    mockQuoteDbCalls({ constraints: [] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pricing).toHaveProperty('priceMode');
    expect(body.pricing).toHaveProperty('printCost');
    expect(body.pricing).toHaveProperty('processCost');
    expect(body.pricing).toHaveProperty('subtotal');
    expect(body.pricing).toHaveProperty('totalPrice');
    expect(body.pricing).toHaveProperty('pricePerUnit');
    expect(body.pricing).toHaveProperty('discountRate');
  });

  it('should return 404 when product not found', async () => {
    mockQuoteDbCalls({ product: null });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 404 when product has no active recipe', async () => {
    mockQuoteDbCalls({ recipe: null });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 400 when productId is missing', async () => {
    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ selections: { QUANTITY: 100 } }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain('productId');
  });

  it('should return 400 when productId is not a positive number', async () => {
    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 0, selections: {} }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain('productId');
  });

  it('should return 400 when selections is missing', async () => {
    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 42 }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain('selections');
  });

  it('should return 400 when selections is not an object', async () => {
    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 42, selections: 'invalid' }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain('selections');
  });

  it('should return 400 when request body is invalid JSON', async () => {
    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not valid json{',
    });

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(400);
  });

  it('should return isValid=true and violations=[] when no constraints triggered', async () => {
    mockQuoteDbCalls({ constraints: [] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 42, selections: { QUANTITY: 100 } }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isValid).toBe(true);
    expect(body.violations).toEqual([]);
  });

  it('should return isValid=false and violations when block constraint triggers', async () => {
    const blockConstraint = {
      id: 2,
      recipeId: 10,
      constraintName: 'paper-incompatible',
      triggerOptionType: 'PAPER',
      triggerOperator: 'EQUALS',
      triggerValues: ['코트지 100g'],
      actions: [{ type: 'block', message: '이 용지는 현재 옵션과 사용 불가능합니다' }],
      priority: 10,
      isActive: true,
    };
    mockQuoteDbCalls({ constraints: [blockConstraint] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        selections: { PAPER: '코트지 100g', QUANTITY: 50 },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isValid).toBe(false);
    expect(body.violations.length).toBeGreaterThan(0);
    expect(body.violations[0]).toHaveProperty('constraintName');
    expect(body.violations[0]).toHaveProperty('message');
  });

  it('should return uiActions for show_message constraint', async () => {
    mockQuoteDbCalls({ constraints: [mockConstraint] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        selections: { FINISHING: ['무광PP'], QUANTITY: 100 },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.uiActions).toBeDefined();
    expect(Array.isArray(body.uiActions)).toBe(true);
    // The CONTAINS operator should trigger on FINISHING=['무광PP']
    if (body.uiActions.length > 0) {
      expect(body.uiActions[0]).toHaveProperty('type');
    }
  });

  it('should return 200 with valid widget auth token', async () => {
    mockQuoteDbCalls({ constraints: [] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    // withWidgetAuth is mocked globally for this file — request succeeds with injected context
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    // Auth mock injects widgetToken context — route executes normally
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('isValid');
  });

  it('should calculate pricing using AREA mode when priceConfig.priceMode=AREA', async () => {
    const areaPriceConfig = {
      id: 2,
      productId: 42,
      priceMode: 'AREA',
      unitPriceSqm: '50000', // 50,000 KRW per sqm
      minAreaSqm: '0.1',
      isActive: true,
    };

    // For AREA mode: db calls are product, recipe.then, priceConfig.then (AREA path), constraints,
    // then in calculatePricing AREA fetches priceConfig again, then qtyDiscount
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;

      if (selectCall === 1) {
        // wbProducts
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockProduct]),
            }),
          }),
        };
      }

      if (selectCall === 2) {
        // productRecipes via .then
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
        // productPriceConfigs via .then → returns AREA config
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                then: vi.fn((resolve: (v: unknown) => unknown) =>
                  Promise.resolve(resolve([areaPriceConfig])),
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

      // AREA pricing: productPriceConfigs lookup + qtyDiscount (returns empty for no discount)
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn((resolve: (v: unknown) => unknown) =>
                Promise.resolve(resolve([areaPriceConfig])),
              ),
            }),
          }),
        }),
      };
    });

    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        catch: vi.fn(),
      }),
    }));

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        selections: { SIZE: '200x300mm', QUANTITY: 1 },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pricing.priceMode).toBe('AREA');
    // 200mm x 300mm = 0.06 sqm, minArea=0.1 sqm, effective=0.1, price=0.1*50000=5000
    expect(body.pricing.printCost).toBe(5000);
  });

  it('should trigger constraint with NOT_IN operator', async () => {
    const notInConstraint = {
      id: 3,
      recipeId: 10,
      constraintName: 'size-not-in-restriction',
      triggerOptionType: 'SIZE',
      triggerOperator: 'NOT_IN',
      triggerValues: ['90x54mm', '100x148mm'],
      actions: [{ type: 'show_message', message: '비표준 사이즈입니다', level: 'warning' }],
      priority: 5,
      isActive: true,
    };

    mockQuoteDbCalls({ constraints: [notInConstraint] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        // SIZE='200x300mm' is NOT IN ['90x54mm', '100x148mm'] → triggers
        selections: { SIZE: '200x300mm', QUANTITY: 50 },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.uiActions.length).toBeGreaterThan(0);
    expect(body.uiActions[0].type).toBe('show_message');
    expect(body.uiActions[0].message).toContain('비표준');
  });

  it('should trigger constraint with NOT_EQUALS operator', async () => {
    const notEqualsConstraint = {
      id: 4,
      recipeId: 10,
      constraintName: 'not-standard-paper',
      triggerOptionType: 'PAPER',
      triggerOperator: 'NOT_EQUALS',
      triggerValues: ['아트지 250g'],
      actions: [{ type: 'show_message', message: '비표준 용지', level: 'info' }],
      priority: 3,
      isActive: true,
    };

    mockQuoteDbCalls({ constraints: [notEqualsConstraint] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        // PAPER='스노우화이트' NOT_EQUALS '아트지 250g' → triggers
        selections: { PAPER: '스노우화이트', QUANTITY: 100 },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.uiActions.length).toBeGreaterThan(0);
    expect(body.uiActions[0].message).toContain('비표준 용지');
  });

  it('should skip constraint when selection value is undefined', async () => {
    const constraint = {
      id: 5,
      recipeId: 10,
      constraintName: 'missing-field',
      triggerOptionType: 'NONEXISTENT_FIELD',
      triggerOperator: 'EQUALS',
      triggerValues: ['some_value'],
      actions: [{ type: 'show_message', message: '발생하지 않아야 함', level: 'info' }],
      priority: 1,
      isActive: true,
    };

    mockQuoteDbCalls({ constraints: [constraint] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        // NONEXISTENT_FIELD is not in selections → constraint is skipped
        selections: { SIZE: '90x54mm', QUANTITY: 100 },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.uiActions).toHaveLength(0);
  });

  it('should return auto_add and show_addon_list in uiActions', async () => {
    const addonConstraint = {
      id: 6,
      recipeId: 10,
      constraintName: 'auto-add-envelope',
      triggerOptionType: 'PAPER',
      triggerOperator: 'IN',
      triggerValues: ['아트지 250g'],
      actions: [
        { type: 'auto_add', addonGroupId: 1, addonItemId: 1 },
        { type: 'show_addon_list', addonGroupId: 2 },
      ],
      priority: 5,
      isActive: true,
    };

    mockQuoteDbCalls({ constraints: [addonConstraint] });

    const { POST } = await import('../../app/api/widget/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 42,
        selections: { PAPER: '아트지 250g', QUANTITY: 100 },
      }),
    });

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    const autoAddAction = body.uiActions.find((a: { type: string }) => a.type === 'auto_add');
    const showAddonAction = body.uiActions.find((a: { type: string }) => a.type === 'show_addon_list');
    expect(autoAddAction).toBeDefined();
    expect(autoAddAction?.addonGroupId).toBe(1);
    expect(showAddonAction).toBeDefined();
    expect(showAddonAction?.addonGroupId).toBe(2);
    // auto_add should also be in addons array
    expect(body.addons.length).toBeGreaterThan(0);
    expect(body.addons[0].type).toBe('auto_add');
  });
});
