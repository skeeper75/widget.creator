/**
 * Test setup and shared mock factories for SPEC-WIDGET-API-001.
 *
 * Provides:
 * - Mock Drizzle DB instance
 * - Mock NextRequest factory
 * - Mock JWT Widget Token generator
 * - Mock Admin session factory
 * - RFC 7807 validation helpers
 * - Pagination validation helpers
 */
import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';

// ─── Mock: @widget-creator/shared/db ────────────────────────────

// Stub table objects used as drizzle schema references in route handlers.
// These are passed as arguments to .from(), .where(eq(...)), etc.
// The actual DB calls are mocked via createMockDb(), so these stubs
// just need to exist and have the expected column properties.
function createStubTable(name: string, columns: string[]) {
  const table: Record<string, unknown> = { _name: name };
  for (const col of columns) {
    table[col] = Symbol(`${name}.${col}`);
  }
  table.$inferSelect = {};
  return table;
}

const stubOrders = createStubTable('orders', [
  'id', 'orderId', 'orderNumber', 'status', 'totalPrice', 'currency',
  'quoteData', 'customerName', 'customerEmail', 'customerPhone',
  'customerCompany', 'shippingMethod', 'shippingAddress',
  'shippingPostalCode', 'shippingMemo', 'shippingTrackingNumber',
  'shippingEstimatedDate', 'widgetId', 'productId', 'createdAt', 'updatedAt',
]);

const stubOrderStatusHistory = createStubTable('order_status_history', [
  'id', 'orderId', 'status', 'memo', 'changedAt',
]);

const stubOrderDesignFiles = createStubTable('order_design_files', [
  'id', 'orderId', 'fileId', 'originalName', 'fileNumber',
  'fileSize', 'mimeType', 'status', 'storageUrl', 'uploadedAt',
]);

// Catalog stubs
const stubCategories = createStubTable('categories', [
  'id', 'parentId', 'code', 'name', 'depth', 'displayOrder', 'isActive', 'createdAt', 'updatedAt',
]);
const stubProducts = createStubTable('products', [
  'id', 'categoryId', 'huniCode', 'edicusCode', 'shopbyId', 'name', 'slug',
  'productType', 'pricingModel', 'sheetStandard', 'orderMethod', 'editorEnabled',
  'description', 'isActive', 'mesRegistered', 'createdAt', 'updatedAt',
]);
const stubProductSizes = createStubTable('product_sizes', [
  'id', 'productId', 'code', 'displayName', 'cutWidth', 'cutHeight',
  'workWidth', 'workHeight', 'bleed', 'impositionCount', 'isCustom',
  'customMinW', 'customMinH', 'customMaxW', 'customMaxH', 'displayOrder', 'isActive',
]);

// Materials stubs
const stubPapers = createStubTable('papers', [
  'id', 'code', 'name', 'abbreviation', 'weight', 'costPer4Cut', 'sellingPer4Cut', 'displayOrder', 'isActive',
]);
const stubPaperProductMappings = createStubTable('paper_product_mapping', [
  'id', 'productId', 'paperId', 'coverType', 'isDefault', 'isActive',
]);

// Options stubs
const stubProductOptions = createStubTable('product_options', [
  'id', 'productId', 'optionDefinitionId', 'uiComponentOverride',
  'displayOrder', 'isRequired', 'isVisible', 'defaultChoiceId', 'isActive',
]);
const stubOptionDefinitions = createStubTable('option_definitions', [
  'id', 'key', 'name', 'optionClass', 'optionType', 'uiComponent', 'isActive',
]);
const stubOptionChoices = createStubTable('option_choices', [
  'id', 'optionDefinitionId', 'code', 'name', 'priceKey', 'refPaperId', 'displayOrder', 'isActive',
]);
const stubOptionConstraints = createStubTable('option_constraints', [
  'id', 'productId', 'constraintType', 'sourceOptionId', 'sourceField',
  'operator', 'value', 'targetOptionId', 'targetField', 'targetAction',
  'description', 'priority', 'isActive',
]);
const stubOptionDependencies = createStubTable('option_dependencies', [
  'id', 'productId', 'parentOptionId', 'parentChoiceId',
  'childOptionId', 'dependencyType', 'isActive',
]);

// Pricing stubs
const stubPriceTables = createStubTable('price_tables', [
  'id', 'code', 'name', 'priceType', 'quantityBasis', 'sheetStandard',
  'description', 'isActive', 'createdAt', 'updatedAt',
]);
const stubPriceTiers = createStubTable('price_tiers', [
  'id', 'priceTableId', 'optionCode', 'minQty', 'maxQty', 'unitPrice',
  'isActive', 'createdAt', 'updatedAt',
]);
const stubFixedPrices = createStubTable('fixed_prices', [
  'id', 'productId', 'sizeId', 'paperId', 'materialId', 'printModeId',
  'optionLabel', 'baseQty', 'sellingPrice', 'costPrice', 'vatIncluded',
  'isActive', 'createdAt', 'updatedAt',
]);

// Process stubs
const stubPrintModes = createStubTable('print_modes', [
  'id', 'code', 'name', 'abbreviation', 'colorCount', 'priceCode', 'sides', 'colorType', 'isActive',
]);
const stubPostProcesses = createStubTable('post_processes', [
  'id', 'code', 'name', 'processType', 'groupCode', 'priceBasis', 'sheetStandard', 'isActive',
]);
const stubBindings = createStubTable('bindings', [
  'id', 'code', 'name', 'bindingType', 'minPages', 'maxPages', 'pageStep', 'isActive',
]);
const stubImpositionRules = createStubTable('imposition_rules', [
  'id', 'productId', 'sizeId', 'cutWidth', 'cutHeight', 'impositionCount', 'sheetStandard', 'isActive',
]);
const stubPackagePrices = createStubTable('package_prices', [
  'id', 'productId', 'sizeId', 'printModeId', 'pageCount', 'minQty', 'maxQty',
  'sellingPrice', 'costPrice', 'isActive',
]);
const stubFoilPrices = createStubTable('foil_prices', [
  'id', 'foilType', 'foilColor', 'plateMaterial', 'targetProductType',
  'width', 'height', 'sellingPrice', 'costPrice', 'isActive',
]);
const stubLossQuantityConfigs = createStubTable('loss_quantity_configs', [
  'id', 'scopeType', 'scopeId', 'lossRate', 'minLossQty', 'isActive',
]);

// Integration stubs
const stubMesItems = createStubTable('mes_items', [
  'id', 'itemCode', 'groupCode', 'name', 'abbreviation', 'itemType',
  'unit', 'isActive', 'createdAt', 'updatedAt',
]);
const stubMesItemOptions = createStubTable('mes_item_options', [
  'id', 'mesItemId', 'optionNumber', 'optionValue', 'isActive',
]);
const stubProductMesMappings = createStubTable('product_mes_mapping', [
  'id', 'productId', 'mesItemId', 'coverType', 'isActive',
]);
const stubOptionChoiceMesMappings = createStubTable('option_choice_mes_mapping', [
  'id', 'optionChoiceId', 'mesItemId', 'mesCode', 'mappingType', 'mappingStatus',
]);
const stubProductEditorMappings = createStubTable('product_editor_mapping', [
  'id', 'productId', 'editorType', 'templateId', 'templateConfig', 'isActive',
]);

// Widget stubs
const stubWidgets = createStubTable('widgets', [
  'id', 'widgetId', 'name', 'status', 'theme', 'apiBaseUrl',
  'allowedOrigins', 'features', 'createdAt', 'updatedAt',
]);

// Shared stub map for both db and schema mocks
const allStubs = {
  categories: stubCategories,
  products: stubProducts,
  productSizes: stubProductSizes,
  papers: stubPapers,
  paperProductMappings: stubPaperProductMappings,
  productOptions: stubProductOptions,
  optionDefinitions: stubOptionDefinitions,
  optionChoices: stubOptionChoices,
  optionConstraints: stubOptionConstraints,
  optionDependencies: stubOptionDependencies,
  priceTables: stubPriceTables,
  priceTiers: stubPriceTiers,
  fixedPrices: stubFixedPrices,
  printModes: stubPrintModes,
  postProcesses: stubPostProcesses,
  bindings: stubBindings,
  impositionRules: stubImpositionRules,
  packagePrices: stubPackagePrices,
  foilPrices: stubFoilPrices,
  lossQuantityConfigs: stubLossQuantityConfigs,
  orders: stubOrders,
  orderStatusHistory: stubOrderStatusHistory,
  orderDesignFiles: stubOrderDesignFiles,
  mesItems: stubMesItems,
  mesItemOptions: stubMesItemOptions,
  productMesMappings: stubProductMesMappings,
  optionChoiceMesMappings: stubOptionChoiceMesMappings,
  productEditorMappings: stubProductEditorMappings,
  widgets: stubWidgets,
};

// We mock the entire db module so route handlers get our spy-based db
// @widget-creator/shared/db re-exports all schema tables
vi.mock('@widget-creator/shared/db', () => ({
  db: createMockDb(),
  ...allStubs,
}));

// Mock schema module for routes that import individual tables
vi.mock('@widget-creator/shared/db/schema', () => allStubs);

/**
 * Create a mock Drizzle DB object with chainable query builder spies.
 * Each call returns a new chainable mock so tests can configure return values.
 */
export function createMockDb() {
  const createChain = (terminal?: unknown) => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const self = new Proxy(chain, {
      get(_target, prop: string) {
        if (prop === 'then') return undefined; // prevent auto-await
        if (!chain[prop]) {
          chain[prop] = vi.fn().mockReturnValue(self);
        }
        return chain[prop];
      },
    });
    return self;
  };

  return {
    select: vi.fn().mockReturnValue(createChain()),
    insert: vi.fn().mockReturnValue(createChain()),
    update: vi.fn().mockReturnValue(createChain()),
    delete: vi.fn().mockReturnValue(createChain()),
    query: new Proxy(
      {},
      {
        get() {
          return createChain();
        },
      },
    ),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn(createMockDb());
    }),
  };
}

// ─── Mock: NextRequest factory ──────────────────────────────────

export interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
}

/**
 * Build a NextRequest for testing API route handlers.
 */
export function createMockRequest(
  path: string,
  options: MockRequestOptions = {},
): NextRequest {
  const {
    method = 'GET',
    headers = {},
    body,
    searchParams = {},
  } = options;

  const url = new URL(path, 'http://localhost:3000');
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
    (init.headers as Headers).set('Content-Type', 'application/json');
  }

  return new NextRequest(url, init);
}

// ─── Mock: Widget Token JWT ─────────────────────────────────────

const WIDGET_TOKEN_SECRET = new TextEncoder().encode(
  'widget-token-secret-change-in-production',
);

export interface WidgetTokenOptions {
  sub?: string;
  iss?: string;
  allowed_origins?: string[];
  exp?: number; // unix timestamp
  iat?: number;
}

/**
 * Generate a signed Widget Token JWT for testing.
 */
export async function createMockWidgetToken(
  overrides: WidgetTokenOptions = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: overrides.sub ?? 'wgt_test_001',
    iss: overrides.iss ?? 'widget.huni.co.kr',
    allowed_origins: overrides.allowed_origins ?? ['http://localhost:3000'],
    iat: overrides.iat ?? now,
    exp: overrides.exp ?? now + 3600,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(WIDGET_TOKEN_SECRET);
}

/**
 * Generate an expired Widget Token JWT for testing.
 */
export async function createExpiredWidgetToken(): Promise<string> {
  const pastTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
  return createMockWidgetToken({
    iat: pastTime - 3600,
    exp: pastTime,
  });
}

// ─── Mock: Admin Session ────────────────────────────────────────

export type AdminRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface MockAdminSession {
  user: {
    id: string;
    email: string;
    role: AdminRole;
  };
}

/**
 * Create a mock NextAuth admin session.
 */
export function createMockAdminSession(
  role: AdminRole = 'ADMIN',
  overrides: Partial<MockAdminSession['user']> = {},
): MockAdminSession {
  return {
    user: {
      id: overrides.id ?? 'admin_001',
      email: overrides.email ?? 'admin@huni.co.kr',
      role,
      ...overrides,
    },
  };
}

// ─── Mock: API Key ──────────────────────────────────────────────

/**
 * Create a mock API key string (UUID v4 format, 36 chars).
 */
export function createMockApiKey(): string {
  return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
}

// ─── Assertion helpers: RFC 7807 ────────────────────────────────

export interface RFC7807Body {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Array<{
    field?: string;
    code: string;
    message: string;
    received?: unknown;
  }>;
  trace_id?: string;
  retry_after?: number;
}

/**
 * Assert that a response body conforms to RFC 7807 Problem Details.
 */
export function assertRFC7807(
  body: unknown,
  expectedStatus: number,
  expectedTypeFragment?: string,
): asserts body is RFC7807Body {
  const b = body as Record<string, unknown>;

  expect(b).toHaveProperty('type');
  expect(b).toHaveProperty('title');
  expect(b).toHaveProperty('status');
  expect(b).toHaveProperty('detail');
  expect(b).toHaveProperty('instance');

  expect(typeof b.type).toBe('string');
  expect(typeof b.title).toBe('string');
  expect(b.status).toBe(expectedStatus);
  expect(typeof b.detail).toBe('string');
  expect(typeof b.instance).toBe('string');

  if (expectedTypeFragment) {
    expect(b.type).toContain(expectedTypeFragment);
  }

  // 5xx errors should include trace_id
  if (expectedStatus >= 500) {
    expect(b).toHaveProperty('trace_id');
  }
}

// ─── Assertion helpers: Pagination ──────────────────────────────

export interface PaginatedResponseBody {
  data: unknown[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  links: {
    self: string;
    next: string | null;
    prev: string | null;
    first: string;
    last: string;
  };
}

/**
 * Assert that a response body conforms to the standard collection envelope.
 */
export function assertPaginatedResponse(
  body: unknown,
  expectedPage: number,
  expectedTotal: number,
  expectedLimit = 20,
): asserts body is PaginatedResponseBody {
  const b = body as PaginatedResponseBody;

  expect(b).toHaveProperty('data');
  expect(b).toHaveProperty('meta');
  expect(b).toHaveProperty('links');

  expect(Array.isArray(b.data)).toBe(true);

  expect(b.meta.page).toBe(expectedPage);
  expect(b.meta.total).toBe(expectedTotal);
  expect(b.meta.limit).toBe(expectedLimit);
  expect(b.meta.total_pages).toBe(
    expectedTotal > 0 ? Math.ceil(expectedTotal / expectedLimit) : 0,
  );

  expect(typeof b.links.self).toBe('string');
  expect(typeof b.links.first).toBe('string');
  expect(typeof b.links.last).toBe('string');
}

// ─── Assertion helpers: snake_case enforcement ──────────────────

/**
 * Recursively check that all object keys in a JSON body are snake_case.
 * Useful for verifying REQ-101 naming convention compliance.
 */
export function assertSnakeCaseKeys(obj: unknown, path = ''): void {
  if (obj === null || obj === undefined || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => assertSnakeCaseKeys(item, `${path}[${i}]`));
    return;
  }

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const fullPath = path ? `${path}.${key}` : key;
    // snake_case: lowercase, numbers, underscores only (no leading/trailing underscores)
    const isSnakeCase = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(key);
    expect(isSnakeCase, `Key "${fullPath}" is not snake_case`).toBe(true);

    assertSnakeCaseKeys(
      (obj as Record<string, unknown>)[key],
      fullPath,
    );
  }
}

// ─── Utility: parse JSON from NextResponse ──────────────────────

/**
 * Extract JSON body from a NextResponse (or Response).
 */
export async function parseResponseBody<T = unknown>(
  response: Response,
): Promise<T> {
  return response.json() as Promise<T>;
}

// ─── Reset helpers ──────────────────────────────────────────────

/**
 * Reset all vi mocks. Call in beforeEach() or afterEach().
 */
export function resetAllMocks(): void {
  vi.restoreAllMocks();
}
