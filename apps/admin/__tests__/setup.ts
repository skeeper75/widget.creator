/**
 * Test setup and shared mock factories for SPEC-WIDGET-ADMIN-001.
 *
 * Provides:
 * - Mock Drizzle DB instance (proxy-based chainable)
 * - Mock tRPC caller factory
 * - Mock admin session factory
 * - Stub table objects for schema references
 * - React testing utilities
 */
import { vi } from 'vitest';

// ─── Stub table factory ─────────────────────────────────────────

function createStubTable(name: string, columns: string[]) {
  const table: Record<string, unknown> = { _name: name };
  for (const col of columns) {
    table[col] = Symbol(`${name}.${col}`);
  }
  table.$inferSelect = {};
  return table;
}

// ─── Catalog stubs ──────────────────────────────────────────────

const stubCategories = createStubTable('categories', [
  'id', 'parentId', 'code', 'name', 'depth', 'displayOrder', 'iconUrl', 'isActive',
  'createdAt', 'updatedAt',
]);

const stubProducts = createStubTable('products', [
  'id', 'categoryId', 'huniCode', 'edicusCode', 'shopbyId', 'name', 'slug',
  'productType', 'pricingModel', 'sheetStandard', 'figmaSection', 'orderMethod',
  'editorEnabled', 'description', 'isActive', 'mesRegistered', 'createdAt', 'updatedAt',
]);

const stubProductSizes = createStubTable('product_sizes', [
  'id', 'productId', 'code', 'displayName', 'cutWidth', 'cutHeight',
  'workWidth', 'workHeight', 'bleed', 'impositionCount', 'sheetStandard',
  'displayOrder', 'isCustom', 'customMinW', 'customMinH', 'customMaxW', 'customMaxH',
  'isActive',
]);

// ─── Materials stubs ────────────────────────────────────────────

const stubPapers = createStubTable('papers', [
  'id', 'code', 'name', 'abbreviation', 'weight', 'sheetSize',
  'costPerRear', 'sellingPerRear', 'costPer4Cut', 'sellingPer4Cut',
  'displayOrder', 'isActive',
]);

const stubMaterials = createStubTable('materials', [
  'id', 'code', 'name', 'materialType', 'thickness', 'description', 'isActive',
]);

const stubPaperProductMappings = createStubTable('paper_product_mapping', [
  'id', 'paperId', 'productId', 'coverType', 'isDefault', 'isActive',
]);

// ─── Process stubs ──────────────────────────────────────────────

const stubPrintModes = createStubTable('print_modes', [
  'id', 'code', 'name', 'sides', 'colorType', 'priceCode', 'displayOrder', 'isActive',
]);

const stubPostProcesses = createStubTable('post_processes', [
  'id', 'groupCode', 'code', 'name', 'processType', 'subOptionCode',
  'subOptionName', 'priceBasis', 'sheetStandard', 'displayOrder', 'isActive',
]);

const stubBindings = createStubTable('bindings', [
  'id', 'code', 'name', 'minPages', 'maxPages', 'pageStep', 'displayOrder', 'isActive',
]);

const stubImpositionRules = createStubTable('imposition_rules', [
  'id', 'cutSizeCode', 'cutWidth', 'cutHeight', 'workWidth', 'workHeight',
  'impositionCount', 'sheetStandard', 'description', 'isActive',
]);

// ─── Pricing stubs ──────────────────────────────────────────────

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

const stubPackagePrices = createStubTable('package_prices', [
  'id', 'productId', 'sizeId', 'printModeId', 'pageCount', 'minQty', 'maxQty',
  'sellingPrice', 'costPrice', 'isActive',
]);

const stubFoilPrices = createStubTable('foil_prices', [
  'id', 'foilType', 'foilColor', 'plateMaterial', 'targetProductType',
  'width', 'height', 'sellingPrice', 'costPrice', 'displayOrder', 'isActive',
]);

const stubLossQuantityConfigs = createStubTable('loss_quantity_configs', [
  'id', 'scopeType', 'scopeId', 'lossRate', 'minLossQty', 'description', 'isActive',
]);

// ─── Options stubs ──────────────────────────────────────────────

const stubOptionDefinitions = createStubTable('option_definitions', [
  'id', 'key', 'name', 'optionClass', 'optionType', 'uiComponent',
  'description', 'displayOrder', 'isActive',
]);

const stubProductOptions = createStubTable('product_options', [
  'id', 'productId', 'optionDefinitionId', 'displayOrder', 'isRequired',
  'isVisible', 'isInternal', 'uiComponentOverride', 'defaultChoiceId', 'isActive',
]);

const stubOptionChoices = createStubTable('option_choices', [
  'id', 'optionDefinitionId', 'code', 'name', 'priceKey',
  'refPaperId', 'refMaterialId', 'refPrintModeId', 'refPostProcessId', 'refBindingId',
  'displayOrder', 'isActive',
]);

const stubOptionConstraints = createStubTable('option_constraints', [
  'id', 'productId', 'constraintType', 'sourceOptionId', 'sourceField',
  'operator', 'value', 'valueMin', 'valueMax', 'targetOptionId', 'targetField',
  'targetAction', 'targetValue', 'description', 'priority', 'isActive',
]);

const stubOptionDependencies = createStubTable('option_dependencies', [
  'id', 'productId', 'parentOptionId', 'parentChoiceId',
  'childOptionId', 'dependencyType', 'isActive',
]);

// ─── Integration stubs ──────────────────────────────────────────

const stubMesItems = createStubTable('mes_items', [
  'id', 'itemCode', 'groupCode', 'name', 'abbreviation', 'itemType',
  'unit', 'isActive',
]);

const stubMesItemOptions = createStubTable('mes_item_options', [
  'id', 'mesItemId', 'optionNumber', 'optionValue', 'isActive',
]);

const stubProductMesMappings = createStubTable('product_mes_mapping', [
  'id', 'productId', 'mesItemId', 'coverType', 'isActive',
]);

const stubProductEditorMappings = createStubTable('product_editor_mapping', [
  'id', 'productId', 'editorType', 'templateId', 'templateConfig', 'isActive',
]);

const stubOptionChoiceMesMappings = createStubTable('option_choice_mes_mapping', [
  'id', 'optionChoiceId', 'mesItemId', 'mesCode', 'mappingType', 'mappingStatus',
  'mappedBy', 'mappedAt', 'notes', 'isActive',
]);

// ─── Widget stubs ───────────────────────────────────────────────

const stubWidgets = createStubTable('widgets', [
  'id', 'widgetId', 'name', 'status', 'shopUrl', 'theme', 'apiKey',
  'allowedOrigins', 'features', 'createdAt', 'updatedAt',
]);

// ─── All stubs map ──────────────────────────────────────────────

export const allStubs = {
  categories: stubCategories,
  products: stubProducts,
  productSizes: stubProductSizes,
  papers: stubPapers,
  materials: stubMaterials,
  paperProductMappings: stubPaperProductMappings,
  printModes: stubPrintModes,
  postProcesses: stubPostProcesses,
  bindings: stubBindings,
  impositionRules: stubImpositionRules,
  priceTables: stubPriceTables,
  priceTiers: stubPriceTiers,
  fixedPrices: stubFixedPrices,
  packagePrices: stubPackagePrices,
  foilPrices: stubFoilPrices,
  lossQuantityConfigs: stubLossQuantityConfigs,
  optionDefinitions: stubOptionDefinitions,
  productOptions: stubProductOptions,
  optionChoices: stubOptionChoices,
  optionConstraints: stubOptionConstraints,
  optionDependencies: stubOptionDependencies,
  mesItems: stubMesItems,
  mesItemOptions: stubMesItemOptions,
  productMesMappings: stubProductMesMappings,
  productEditorMappings: stubProductEditorMappings,
  optionChoiceMesMappings: stubOptionChoiceMesMappings,
  widgets: stubWidgets,
};

// Mock schema modules
vi.mock('@widget-creator/shared/db', () => ({
  db: createMockDb(),
  ...allStubs,
}));

vi.mock('@widget-creator/shared/db/schema', () => allStubs);

// ─── Mock DB factory ────────────────────────────────────────────

/**
 * Create a mock Drizzle DB object with chainable query builder spies.
 * Proxy-based: any method call returns a chainable mock.
 */
export function createMockDb() {
  const createChain = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const self = new Proxy(chain, {
      get(_target, prop: string) {
        if (prop === 'then') return undefined;
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

// ─── Mock admin session ─────────────────────────────────────────

export type AdminRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface MockAdminSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
}

export function createMockAdminSession(
  role: AdminRole = 'ADMIN',
  overrides: Partial<MockAdminSession['user']> = {},
): MockAdminSession {
  return {
    user: {
      id: overrides.id ?? 'admin_001',
      email: overrides.email ?? 'admin@huni.co.kr',
      name: overrides.name ?? 'Test Admin',
      role,
      ...overrides,
    },
  };
}

// ─── Test data factories ────────────────────────────────────────

export function createMockCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    parentId: null,
    code: 'CAT001',
    name: 'Test Category',
    depth: 0,
    displayOrder: 1,
    iconUrl: null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    categoryId: 1,
    huniCode: 'HN001',
    edicusCode: null,
    shopbyId: null,
    name: 'Test Product',
    slug: 'test-product',
    productType: 'digital_print',
    pricingModel: 'tiered',
    sheetStandard: 'A3',
    figmaSection: null,
    orderMethod: 'upload',
    editorEnabled: false,
    description: 'A test product',
    isActive: true,
    mesRegistered: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockPaper(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    code: 'PAP001',
    name: 'Test Paper',
    abbreviation: 'TP',
    weight: 150,
    sheetSize: 'A3',
    costPerRear: 1000,
    sellingPerRear: 1500,
    costPer4Cut: 250,
    sellingPer4Cut: 375,
    displayOrder: 1,
    isActive: true,
    ...overrides,
  };
}

export function createMockOptionDefinition(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    key: 'paper_type',
    name: 'Paper Type',
    optionClass: 'paper',
    optionType: 'select',
    uiComponent: 'dropdown',
    description: 'Select paper type',
    displayOrder: 1,
    isActive: true,
    ...overrides,
  };
}

export function createMockPriceTable(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    code: 'PT001',
    name: 'Test Price Table',
    priceType: 'selling',
    quantityBasis: 'sheet',
    sheetStandard: 'A3',
    description: 'A test price table',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockPriceTier(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    priceTableId: 1,
    optionCode: 'OPT001',
    minQty: 1,
    maxQty: 100,
    unitPrice: 500,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockBinding(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    code: 'BND001',
    name: 'Saddle Stitch',
    minPages: 8,
    maxPages: 64,
    pageStep: 4,
    displayOrder: 1,
    isActive: true,
    ...overrides,
  };
}

export function createMockMesItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    itemCode: 'MES001',
    groupCode: 'PRINT',
    name: 'Test MES Item',
    abbreviation: 'TMI',
    itemType: 'material',
    unit: 'EA',
    isActive: true,
    ...overrides,
  };
}

export function createMockOptionChoiceMesMapping(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    optionChoiceId: 1,
    mesItemId: null,
    mesCode: null,
    mappingType: 'direct',
    mappingStatus: 'pending',
    mappedBy: null,
    mappedAt: null,
    notes: null,
    isActive: true,
    ...overrides,
  };
}

// ─── Reset helpers ──────────────────────────────────────────────

export function resetAllMocks(): void {
  vi.restoreAllMocks();
}
