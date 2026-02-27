/**
 * Tests for GET /api/widget/products/:productKey/init
 * SPEC-WB-006 FR-WB006-03, FR-WB006-08: Widget initialization data load
 *
 * Route: apps/web/app/api/widget/products/[productKey]/init/route.ts
 * Public endpoint (no auth required), rate limited, CDN cached.
 *
 * Returns in a single API call:
 *   - product: product info with mesItemCd, editor/upload flags
 *   - recipe: active recipe with option bindings and choices
 *   - constraintRules: JSON rules for client-side json-rules-engine
 *   - defaultSelections: pre-populated default option selections
 *   - defaultQuote: { isValid, uiActions, pricing, violations, addons }
 * Cache-Control: public, max-age=60
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';

// Mock all @widget-creator/db exports needed by the init route
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

// Binding for SIZE option type
const mockBinding = {
  bindingId: 1,
  typeId: 100,
  displayOrder: 1,
  processingOrder: 1,
  isRequired: true,
  defaultChoiceId: 201,
  typeKey: 'SIZE',
  typeNameKo: '사이즈',
  uiControl: 'SELECT',
  optionCategory: 'base',
};

const mockChoice = {
  id: 201,
  typeId: 100,
  choiceKey: '90x54mm',
  displayName: '90x54mm (명함 표준)',
  value: '90x54mm',
  isDefault: true,
  thumbnailUrl: null,
  colorHex: null,
  priceImpact: null,
  widthMm: '90',
  heightMm: '54',
  displayOrder: 1,
  isActive: true,
};

const mockConstraintRule = {
  id: 1,
  recipeId: 10,
  constraintName: 'standard-size-msg',
  triggerOptionType: 'SIZE',
  triggerOperator: 'EQUALS',
  triggerValues: ['90x54mm'],
  actions: [{ type: 'show_message', message: '명함 표준 사이즈입니다', level: 'info' }],
  priority: 1,
  isActive: true,
};

describe('GET /api/widget/products/:productKey/init', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * The route makes these DB calls in order:
   * 1. db.select().from(wbProducts).where(...).limit(1)    -> product by productKey
   * 2. Promise.all([
   *      productRecipes (isDefault=true, isArchived=false),
   *      productPriceConfigs,
   *    ])
   * 3. Promise.all([
   *      recipeOptionBindings innerJoin optionElementTypes (ordered),
   *      recipeConstraints,
   *    ])
   * 4. optionElementChoices (filtered by typeIds)
   * 5. calculateDefaultPrice -> printCostBase, qtyDiscount queries
   */
  function mockInitDbCalls(options: {
    product?: Record<string, unknown> | null;
    recipe?: Record<string, unknown> | null;
    priceConfig?: Record<string, unknown> | null;
    bindings?: Record<string, unknown>[];
    constraints?: Record<string, unknown>[];
    choices?: Record<string, unknown>[];
  } = {}) {
    const {
      product = mockProduct,
      recipe = mockRecipe,
      priceConfig = mockPriceConfig,
      bindings = [mockBinding],
      constraints = [mockConstraintRule],
      choices = [mockChoice],
    } = options;

    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation((fields?: unknown) => {
      selectCall++;

      // Call 1: product by productKey
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
        // productRecipes via .then((rows) => rows[0])
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
        // productPriceConfigs via .then((rows) => rows[0])
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

      // Calls 4+5: Promise.all([bindings with innerJoin, constraints])
      if (selectCall === 4) {
        // recipeOptionBindings innerJoin optionElementTypes with .orderBy()
        // db.select({...}).from().innerJoin().where().orderBy()
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(bindings),
              }),
            }),
          }),
        };
      }

      if (selectCall === 5) {
        // recipeConstraints
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(constraints),
          }),
        };
      }

      // Call 6: optionElementChoices (filtered via .then())
      if (selectCall === 6) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              then: vi.fn((resolve: (v: unknown) => unknown) =>
                Promise.resolve(resolve(choices)),
              ),
            }),
          }),
        };
      }

      // Pricing calls for defaultPrice: printCostBase, qtyDiscount (via .limit(1) -> result[0])
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
    });
  }

  it('should return product, recipe, constraintRules, defaultSelections, and defaultQuote', async () => {
    mockInitDbCalls();

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));
    const body = await response.json();

    expect(response.status).toBe(200);

    // Product info
    expect(body).toHaveProperty('product');
    expect(body.product).toHaveProperty('id', 42);
    expect(body.product).toHaveProperty('productKey', 'business-card');
    expect(body.product).toHaveProperty('productNameKo');
    expect(body.product).toHaveProperty('mesItemCd');

    // Recipe structure
    expect(body).toHaveProperty('recipe');
    expect(body.recipe).toHaveProperty('id');
    expect(body.recipe).toHaveProperty('recipeVersion');
    expect(body.recipe).toHaveProperty('options');
    expect(Array.isArray(body.recipe.options)).toBe(true);

    // Constraint rules for client-side json-rules-engine
    expect(body).toHaveProperty('constraintRules');
    expect(Array.isArray(body.constraintRules)).toBe(true);

    // Default selections
    expect(body).toHaveProperty('defaultSelections');
    expect(typeof body.defaultSelections).toBe('object');

    // Default quote
    expect(body).toHaveProperty('defaultQuote');
    expect(body.defaultQuote).toHaveProperty('isValid');
    expect(body.defaultQuote).toHaveProperty('pricing');
    expect(body.defaultQuote).toHaveProperty('uiActions');
    expect(body.defaultQuote).toHaveProperty('violations');
    expect(body.defaultQuote).toHaveProperty('addons');
  });

  it('should return 404 when product not found by productKey', async () => {
    mockInitDbCalls({ product: null });

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/nonexistent/init');

    const response = await GET(req, routeCtx({ productKey: 'nonexistent' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 404 when product has no active recipe', async () => {
    mockInitDbCalls({ recipe: null });

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should set Cache-Control header for CDN caching', async () => {
    mockInitDbCalls();

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));

    expect(response.status).toBe(200);
    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toBeTruthy();
    expect(cacheControl).toContain('max-age=');
    expect(cacheControl).toContain('public');
  });

  it('should return constraint rules in json-rules-engine format', async () => {
    mockInitDbCalls({ constraints: [mockConstraintRule] });

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.constraintRules.length).toBeGreaterThan(0);

    const rule = body.constraintRules[0];
    // json-rules-engine format: { name, conditions, event, priority }
    expect(rule).toHaveProperty('name');
    expect(rule).toHaveProperty('conditions');
    expect(rule).toHaveProperty('event');
    expect(rule).toHaveProperty('priority');
    expect(rule.conditions).toHaveProperty('all');
  });

  it('should return empty constraintRules when no constraints defined', async () => {
    mockInitDbCalls({ constraints: [] });

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.constraintRules).toEqual([]);
  });

  it('should include option choices in recipe options structure', async () => {
    mockInitDbCalls();

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));
    const body = await response.json();

    expect(response.status).toBe(200);

    const options = body.recipe.options;
    expect(options.length).toBeGreaterThan(0);

    const sizeOption = options.find((o: Record<string, unknown>) => o.typeKey === 'SIZE');
    expect(sizeOption).toBeDefined();
    expect(sizeOption.choices).toBeDefined();
    expect(Array.isArray(sizeOption.choices)).toBe(true);

    // Each choice should have required fields
    if (sizeOption.choices.length > 0) {
      const choice = sizeOption.choices[0];
      expect(choice).toHaveProperty('id');
      expect(choice).toHaveProperty('choiceKey');
      expect(choice).toHaveProperty('displayName');
    }
  });

  it('should build defaultSelections from default choices', async () => {
    mockInitDbCalls();

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    // Default choice for SIZE (id=201, value='90x54mm', isDefault=true)
    expect(body.defaultSelections).toHaveProperty('SIZE');
    expect(body.defaultSelections['SIZE']).toBe('90x54mm');
  });

  it('should be accessible without auth token (public endpoint)', async () => {
    mockInitDbCalls();

    const { GET } = await import('../../app/api/widget/products/[productKey]/init/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/products/business-card/init');
    // No auth headers

    const response = await GET(req, routeCtx({ productKey: 'business-card' }));

    // Public endpoint — should NOT return 401 or 403
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});
