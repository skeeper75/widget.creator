/**
 * Unit tests for Product Registration Orchestrator
 *
 * Tests cover the full registration flow from PrintProduct to Shopby mallProduct,
 * batch processing, retry logic, and result reporting.
 *
 * SPEC: SPEC-SHOPBY-002 M3 - Batch Registration
 * AC-001: Product auto-registration (명함, 스티커, 전단, 책자)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProductRegistrationService } from '../product-registration.js';
import type { ProductRegistrationRequest } from '../types.js';

// =============================================================================
// Mock external modules
// =============================================================================

// Module mocks - factory only defines vi.fn(), actual return values set in beforeEach
vi.mock('../mapper.js', () => ({
  toMallProduct: vi.fn(),
  buildWidgetOptionMapping: vi.fn(),
}));

vi.mock('../option-generator.js', () => ({
  buildOptionMatrix: vi.fn(),
  createPriceLookup: vi.fn(),
}));

vi.mock('../price-mapper.js', () => ({
  buildPriceMap: vi.fn(),
  roundKrwPrice: vi.fn(),
}));

import { toMallProduct, buildWidgetOptionMapping } from '../mapper.js';
import { buildOptionMatrix, createPriceLookup } from '../option-generator.js';
import { buildPriceMap, roundKrwPrice } from '../price-mapper.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockAdminClient() {
  return {
    createProduct: vi.fn().mockResolvedValue({ mallProductNo: 99001 }),
    getProduct: vi.fn(),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn(),
    listProducts: vi.fn(),
    getProductOptions: vi.fn(),
    updateProductOptions: vi.fn().mockResolvedValue(undefined),
    listCategories: vi.fn(),
    getCategory: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    resetCircuitBreaker: vi.fn(),
  };
}

function createMockCategoryService() {
  return {
    getCategoryNo: vi.fn().mockReturnValue(101),
    getCategoryKey: vi.fn().mockReturnValue('namecard'),
    setCategoryMapping: vi.fn(),
    setRootCategoryNo: vi.fn(),
    loadCategoryMappings: vi.fn(),
    getAllMappings: vi.fn(),
    getRootCategoryNo: vi.fn(),
    isFullyMapped: vi.fn(),
    getUnmappedKeys: vi.fn(),
    getHierarchy: vi.fn(),
    ensureCategories: vi.fn(),
  };
}

function createSilentLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createSampleRequest(overrides?: Partial<ProductRegistrationRequest>): ProductRegistrationRequest {
  return {
    huniProductId: 1,
    huniCode: '001-0001',
    productName: '일반명함',
    description: '<p>고급 명함 인쇄</p>',
    categoryId: 10,
    productType: 'digital-print',
    pricingModel: 'standard',
    sheetStandard: '4x6',
    orderMethod: 'upload',
    editorEnabled: false,
    isActive: true,
    deliveryTemplateNo: 1,
    sizes: [{ code: 'S1', displayName: '90x50mm' }],
    papers: [{ code: 'P1', name: '스노우화이트 250g', weight: 250 }],
    quantities: [{ quantity: 100, label: '100매' }],
    prices: [{ sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 }],
    mesItemCode: 'MES-001',
    ...overrides,
  };
}

// =============================================================================
// Setup
// =============================================================================

let service: ProductRegistrationService;
let mockClient: ReturnType<typeof createMockAdminClient>;
let mockCategoryService: ReturnType<typeof createMockCategoryService>;
let mockLogger: ReturnType<typeof createSilentLogger>;

beforeEach(() => {
  vi.useFakeTimers();
  mockClient = createMockAdminClient();
  mockCategoryService = createMockCategoryService();
  mockLogger = createSilentLogger();

  // Reset module mock return values each test
  (toMallProduct as ReturnType<typeof vi.fn>).mockReturnValue({
    productName: 'Test Product',
    price: { salePrice: 10000 },
    saleStatusType: 'ONSALE',
    displayCategoryNos: [100],
    extraJson: JSON.stringify({ version: '1.0.0' }),
  });
  (buildWidgetOptionMapping as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string, type: string, required: boolean, shopbyMapping: string) => ({
      key, type, required, shopbyMapping,
    })
  );
  (buildOptionMatrix as ReturnType<typeof vi.fn>).mockReturnValue({
    combinations: [
      { kind: 'COMBINATION', optionName: '규격', optionValues: [{ optionValue: '90x50mm', addPrice: 0 }] },
    ],
    combinationEntries: [
      { values: ['90x50mm', '스노우화이트', '100매'], codes: ['S1', 'P1', 'QTY_100'], addPrice: 0 },
    ],
    required: [],
    standard: [],
    basePrice: 10000,
    totalCombinationCount: 1,
    registeredCombinationCount: 1,
    isRepresentativeSubset: false,
  });
  (createPriceLookup as ReturnType<typeof vi.fn>).mockReturnValue(new Map());
  (buildPriceMap as ReturnType<typeof vi.fn>).mockReturnValue({
    salePrice: 10000,
    addPrices: new Map([['S1|P1|100', 0]]),
  });
  (roundKrwPrice as ReturnType<typeof vi.fn>).mockImplementation((price: number) => Math.round(price));

  service = new ProductRegistrationService(
    mockClient as never,
    mockCategoryService as never,
    mockLogger,
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// =============================================================================
// SECTION 1: Single Product Registration (AC-001)
// =============================================================================

describe('ProductRegistrationService', () => {
  describe('registerProduct', () => {
    describe('successful registration', () => {
      it('should return success with shopbyProductNo', async () => {
        const request = createSampleRequest();
        const result = await service.registerProduct(request);

        expect(result.success).toBe(true);
        expect(result.shopbyProductNo).toBe(99001);
        expect(result.huniProductId).toBe(1);
        expect(result.huniCode).toBe('001-0001');
      });

      it('should call adminClient.createProduct', async () => {
        const request = createSampleRequest();
        await service.registerProduct(request);

        expect(mockClient.createProduct).toHaveBeenCalledTimes(1);
      });

      it('should call adminClient.updateProductOptions with option data', async () => {
        const request = createSampleRequest();
        await service.registerProduct(request);

        expect(mockClient.updateProductOptions).toHaveBeenCalledTimes(1);
        expect(mockClient.updateProductOptions).toHaveBeenCalledWith(99001, expect.objectContaining({
          combinations: expect.any(Array),
        }));
      });

      it('should include optionCounts in result', async () => {
        const request = createSampleRequest();
        const result = await service.registerProduct(request);

        expect(result.optionCounts).toBeDefined();
        expect(result.optionCounts!.combinations).toBe(1);
        expect(result.optionCounts!.required).toBe(0);
        expect(result.optionCounts!.standard).toBe(0);
      });

      it('should log product creation and option configuration', async () => {
        const request = createSampleRequest();
        await service.registerProduct(request);

        expect(mockLogger.info).toHaveBeenCalledWith('Product created in Shopby', expect.objectContaining({
          huniCode: '001-0001',
          mallProductNo: 99001,
        }));
        expect(mockLogger.info).toHaveBeenCalledWith('Product options configured', expect.objectContaining({
          huniCode: '001-0001',
          mallProductNo: 99001,
        }));
      });
    });

    describe('product types (AC-001)', () => {
      it('should register namecard product', async () => {
        const request = createSampleRequest({ productType: 'digital-print' });
        const result = await service.registerProduct(request);
        expect(result.success).toBe(true);
        expect(mockCategoryService.getCategoryNo).toHaveBeenCalledWith('digital-print');
      });

      it('should register sticker product', async () => {
        const request = createSampleRequest({
          huniCode: '002-0001',
          productName: '원형스티커',
          productType: 'sticker',
        });
        mockCategoryService.getCategoryNo.mockReturnValueOnce(102);
        const result = await service.registerProduct(request);
        expect(result.success).toBe(true);
      });

      it('should register flyer product', async () => {
        const request = createSampleRequest({
          huniCode: '003-0001',
          productName: '전단지',
          productType: 'flyer',
        });
        mockCategoryService.getCategoryNo.mockReturnValueOnce(103);
        const result = await service.registerProduct(request);
        expect(result.success).toBe(true);
      });

      it('should register booklet product with printModes', async () => {
        const request = createSampleRequest({
          huniCode: '004-0001',
          productName: '책자',
          productType: 'booklet',
          printModes: [{ code: 'CMYK', name: '4도' }],
        });
        mockCategoryService.getCategoryNo.mockReturnValueOnce(104);
        const result = await service.registerProduct(request);
        expect(result.success).toBe(true);
      });

      it('should register product with postProcesses', async () => {
        const request = createSampleRequest({
          postProcesses: [{ code: 'COATING', name: '코팅' }],
        });
        const result = await service.registerProduct(request);
        expect(result.success).toBe(true);
      });
    });

    describe('category mapping', () => {
      it('should fail when category mapping not found', async () => {
        mockCategoryService.getCategoryNo.mockReturnValueOnce(undefined);
        const request = createSampleRequest({ productType: 'unknown-type' });

        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('No category mapping');
        expect(result.error).toContain('unknown-type');
      });
    });

    describe('validation errors', () => {
      it('should fail when huniCode is empty', async () => {
        const request = createSampleRequest({ huniCode: '' });
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('huniCode is required');
      });

      it('should fail when productName is empty', async () => {
        const request = createSampleRequest({ productName: '' });
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('productName is required');
      });

      it('should fail when productType is empty', async () => {
        const request = createSampleRequest({ productType: '' });
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('productType is required');
      });

      it('should fail when sizes is empty', async () => {
        const request = createSampleRequest({ sizes: [] });
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('At least one size');
      });

      it('should fail when papers is empty', async () => {
        const request = createSampleRequest({ papers: [] });
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('At least one paper');
      });

      it('should fail when quantities is empty', async () => {
        const request = createSampleRequest({ quantities: [] });
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('At least one quantity');
      });

      it('should fail when prices is empty', async () => {
        const request = createSampleRequest({ prices: [] });
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('At least one price');
      });
    });

    describe('error handling', () => {
      it('should handle createProduct API failure', async () => {
        mockClient.createProduct.mockRejectedValueOnce(new Error('API error'));
        const request = createSampleRequest();
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('API error');
      });

      it('should handle updateProductOptions failure', async () => {
        mockClient.updateProductOptions.mockRejectedValueOnce(new Error('Options error'));
        const request = createSampleRequest();
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Options error');
      });

      it('should log error details on failure', async () => {
        mockClient.createProduct.mockRejectedValueOnce(new Error('Network failure'));
        const request = createSampleRequest();
        await service.registerProduct(request);

        expect(mockLogger.error).toHaveBeenCalledWith('Product registration failed', expect.objectContaining({
          huniCode: '001-0001',
          error: 'Network failure',
        }));
      });

      it('should handle non-Error thrown values', async () => {
        mockClient.createProduct.mockRejectedValueOnce('string error');
        const request = createSampleRequest();
        const result = await service.registerProduct(request);

        expect(result.success).toBe(false);
        expect(result.error).toBe('string error');
      });

      it('should return huniProductId and huniCode in failure result', async () => {
        mockClient.createProduct.mockRejectedValueOnce(new Error('fail'));
        const request = createSampleRequest({ huniProductId: 42, huniCode: '042-0001' });
        const result = await service.registerProduct(request);

        expect(result.huniProductId).toBe(42);
        expect(result.huniCode).toBe('042-0001');
      });
    });
  });

  // =============================================================================
  // SECTION 2: Batch Registration (AC-001)
  // =============================================================================

  describe('batchRegister', () => {
    describe('successful batch', () => {
      it('should register multiple products and return batch result', async () => {
        const requests = [
          createSampleRequest({ huniProductId: 1, huniCode: '001-0001' }),
          createSampleRequest({ huniProductId: 2, huniCode: '002-0001' }),
        ];

        mockClient.createProduct
          .mockResolvedValueOnce({ mallProductNo: 99001 })
          .mockResolvedValueOnce({ mallProductNo: 99002 });

        const resultPromise = service.batchRegister(requests);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.total).toBe(2);
        expect(result.succeeded).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.results).toHaveLength(2);
      });

      it('should include timing information', async () => {
        const requests = [createSampleRequest()];
        const resultPromise = service.batchRegister(requests);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.startedAt).toBeDefined();
        expect(result.completedAt).toBeDefined();
      });

      it('should count successes and failures correctly', async () => {
        mockClient.createProduct
          .mockResolvedValueOnce({ mallProductNo: 99001 })
          .mockRejectedValue(new Error('fail'));

        const requests = [
          createSampleRequest({ huniProductId: 1, huniCode: '001-0001' }),
          createSampleRequest({ huniProductId: 2, huniCode: '002-0001' }),
        ];

        const resultPromise = service.batchRegister(requests, { maxRetries: 1 });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.succeeded).toBe(1);
        expect(result.failed).toBe(1);
      });

      it('should call onProgress callback', async () => {
        const onProgress = vi.fn();
        const requests = [createSampleRequest()];

        const resultPromise = service.batchRegister(requests, { onProgress });
        await vi.runAllTimersAsync();
        await resultPromise;

        expect(onProgress).toHaveBeenCalledWith(1, 1, expect.objectContaining({ success: true }));
      });
    });

    describe('partial failure', () => {
      it('should continue after individual product failure (default)', async () => {
        mockClient.createProduct
          .mockRejectedValueOnce(new Error('fail1'))
          .mockResolvedValueOnce({ mallProductNo: 99002 })
          .mockResolvedValueOnce({ mallProductNo: 99003 });

        const requests = [
          createSampleRequest({ huniProductId: 1, huniCode: '001' }),
          createSampleRequest({ huniProductId: 2, huniCode: '002' }),
          createSampleRequest({ huniProductId: 3, huniCode: '003' }),
        ];

        const resultPromise = service.batchRegister(requests, { maxRetries: 1 });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.total).toBe(3);
        expect(result.succeeded).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.results).toHaveLength(3);
      });

      it('should stop batch when continueOnError is false', async () => {
        mockClient.createProduct
          .mockResolvedValueOnce({ mallProductNo: 99001 })
          .mockRejectedValue(new Error('fail'));

        const requests = [
          createSampleRequest({ huniProductId: 1, huniCode: '001' }),
          createSampleRequest({ huniProductId: 2, huniCode: '002' }),
          createSampleRequest({ huniProductId: 3, huniCode: '003' }),
        ];

        const resultPromise = service.batchRegister(requests, {
          continueOnError: false,
          maxRetries: 1,
        });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // Stops after product 2 fails
        expect(result.results).toHaveLength(2);
        expect(result.succeeded).toBe(1);
        expect(result.failed).toBe(1);
      });
    });

    describe('retry logic', () => {
      it('should retry failed registration up to maxRetries', async () => {
        // Fail twice, succeed on third attempt
        mockClient.createProduct
          .mockRejectedValueOnce(new Error('transient error'))
          .mockRejectedValueOnce(new Error('transient error'))
          .mockResolvedValueOnce({ mallProductNo: 99001 });

        const requests = [createSampleRequest()];
        const resultPromise = service.batchRegister(requests, { maxRetries: 3 });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.succeeded).toBe(1);
        expect(result.failed).toBe(0);
        // createProduct called 3 times (2 failures + 1 success)
        expect(mockClient.createProduct).toHaveBeenCalledTimes(3);
      });

      it('should give up after max retries exhausted', async () => {
        mockClient.createProduct.mockRejectedValue(new Error('persistent error'));

        const requests = [createSampleRequest()];
        const resultPromise = service.batchRegister(requests, { maxRetries: 3 });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.failed).toBe(1);
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].error).toContain('persistent error');
      });

      it('should log retry warnings', async () => {
        mockClient.createProduct
          .mockRejectedValueOnce(new Error('transient'))
          .mockResolvedValueOnce({ mallProductNo: 99001 });

        const requests = [createSampleRequest()];
        const resultPromise = service.batchRegister(requests, { maxRetries: 2 });
        await vi.runAllTimersAsync();
        await resultPromise;

        expect(mockLogger.warn).toHaveBeenCalledWith('Retrying product registration', expect.objectContaining({
          attempt: 1,
          maxRetries: 2,
        }));
      });

      it('should use default maxRetries of 3', async () => {
        mockClient.createProduct.mockRejectedValue(new Error('fail'));

        const requests = [createSampleRequest()];
        const resultPromise = service.batchRegister(requests);
        await vi.runAllTimersAsync();
        await resultPromise;

        // 3 attempts (default MAX_RETRIES=3)
        expect(mockClient.createProduct).toHaveBeenCalledTimes(3);
      });
    });

    describe('batch options', () => {
      it('should use default options when none provided', async () => {
        const requests = [createSampleRequest()];
        const resultPromise = service.batchRegister(requests);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.total).toBe(1);
        expect(result.succeeded).toBe(1);
      });

      it('should handle empty requests array', async () => {
        const resultPromise = service.batchRegister([]);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.total).toBe(0);
        expect(result.succeeded).toBe(0);
        expect(result.failed).toBe(0);
        expect(result.results).toHaveLength(0);
      });

      it('should log batch start and completion', async () => {
        const requests = [createSampleRequest()];
        const resultPromise = service.batchRegister(requests);
        await vi.runAllTimersAsync();
        await resultPromise;

        expect(mockLogger.info).toHaveBeenCalledWith('Starting batch registration', expect.objectContaining({
          total: 1,
        }));
        expect(mockLogger.info).toHaveBeenCalledWith('Batch registration completed', expect.objectContaining({
          total: 1,
          succeeded: 1,
          failed: 0,
        }));
      });
    });
  });

  // =============================================================================
  // SECTION 3: Constructor & Initialization
  // =============================================================================

  describe('initialization', () => {
    it('should create service with all dependencies', () => {
      expect(service).toBeDefined();
    });

    it('should use default logger when none provided', () => {
      const svc = new ProductRegistrationService(
        mockClient as never,
        mockCategoryService as never,
      );
      expect(svc).toBeDefined();
    });
  });

  // =============================================================================
  // SECTION 4: Feature Resolution
  // =============================================================================

  describe('feature resolution', () => {
    const mockToMallProduct = toMallProduct as ReturnType<typeof vi.fn>;

    it('should always include pricing feature', async () => {
      const request = createSampleRequest({ editorEnabled: false, orderMethod: 'upload' });
      const result = await service.registerProduct(request);
      expect(result.success).toBe(true);
      expect(mockToMallProduct).toHaveBeenCalled();
    });

    it('should include editor feature when editorEnabled is true', async () => {
      const request = createSampleRequest({ editorEnabled: true });
      await service.registerProduct(request);

      const call = mockToMallProduct.mock.calls[0];
      const widgetConfig = call[2];
      expect(widgetConfig.features).toContain('editor');
    });

    it('should include upload feature when orderMethod is upload', async () => {
      const request = createSampleRequest({ orderMethod: 'upload' });
      await service.registerProduct(request);

      const call = mockToMallProduct.mock.calls[0];
      const widgetConfig = call[2];
      expect(widgetConfig.features).toContain('upload');
    });

    it('should include finishing feature when postProcesses present', async () => {
      const request = createSampleRequest({
        postProcesses: [{ code: 'COAT', name: 'Coating' }],
      });
      await service.registerProduct(request);

      const call = mockToMallProduct.mock.calls[0];
      const widgetConfig = call[2];
      expect(widgetConfig.features).toContain('finishing');
    });

    it('should not include editor feature when editorEnabled is false', async () => {
      const request = createSampleRequest({ editorEnabled: false, orderMethod: 'editor' });
      await service.registerProduct(request);

      const call = mockToMallProduct.mock.calls[0];
      const widgetConfig = call[2];
      expect(widgetConfig.features).not.toContain('editor');
    });
  });

  // =============================================================================
  // SECTION 5: Widget Option Mapping
  // =============================================================================

  describe('widget option mapping', () => {
    const mockBuildMapping = buildWidgetOptionMapping as ReturnType<typeof vi.fn>;

    it('should always create size, paper, quantity mappings', async () => {
      const request = createSampleRequest();
      await service.registerProduct(request);

      expect(mockBuildMapping.mock.calls).toEqual(expect.arrayContaining([
        ['size', 'select', true, 'COMBINATION_1'],
        ['paper', 'select', true, 'COMBINATION_2'],
        ['quantity', 'select', true, 'COMBINATION_3'],
      ]));
    });

    it('should add printType mapping when printModes present', async () => {
      const request = createSampleRequest({
        printModes: [{ code: 'CMYK', name: '4도' }],
      });
      await service.registerProduct(request);

      expect(mockBuildMapping).toHaveBeenCalledWith('printType', 'select', true, 'REQUIRED');
    });

    it('should add finishing mapping when postProcesses present', async () => {
      const request = createSampleRequest({
        postProcesses: [{ code: 'COAT', name: 'Coating' }],
      });
      await service.registerProduct(request);

      expect(mockBuildMapping).toHaveBeenCalledWith('finishing', 'multiselect', false, 'STANDARD');
    });

    it('should not add printType mapping when printModes is undefined', async () => {
      const request = createSampleRequest({ printModes: undefined });
      await service.registerProduct(request);

      expect(mockBuildMapping).not.toHaveBeenCalledWith('printType', expect.any(String), expect.any(Boolean), expect.any(String));
    });

    it('should not add finishing mapping when postProcesses is empty array', async () => {
      const request = createSampleRequest({ postProcesses: [] });
      await service.registerProduct(request);

      expect(mockBuildMapping).not.toHaveBeenCalledWith('finishing', expect.any(String), expect.any(Boolean), expect.any(String));
    });
  });

  // =============================================================================
  // SECTION 6: Edge Cases
  // =============================================================================

  describe('edge cases', () => {
    it('should handle product with optional description undefined', async () => {
      const request = createSampleRequest({ description: undefined });
      const result = await service.registerProduct(request);
      expect(result.success).toBe(true);
    });

    it('should handle product with multiple sizes, papers, quantities', async () => {
      const request = createSampleRequest({
        sizes: [
          { code: 'S1', displayName: '90x50mm' },
          { code: 'S2', displayName: '86x54mm' },
        ],
        papers: [
          { code: 'P1', name: '스노우화이트 250g' },
          { code: 'P2', name: '아르떼 300g' },
        ],
        quantities: [
          { quantity: 100, label: '100매' },
          { quantity: 200, label: '200매' },
        ],
        prices: [
          { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
          { sizeCode: 'S1', paperCode: 'P1', quantity: 200, sellingPrice: 15000 },
          { sizeCode: 'S1', paperCode: 'P2', quantity: 100, sellingPrice: 12000 },
          { sizeCode: 'S1', paperCode: 'P2', quantity: 200, sellingPrice: 18000 },
          { sizeCode: 'S2', paperCode: 'P1', quantity: 100, sellingPrice: 11000 },
          { sizeCode: 'S2', paperCode: 'P1', quantity: 200, sellingPrice: 16000 },
          { sizeCode: 'S2', paperCode: 'P2', quantity: 100, sellingPrice: 13000 },
          { sizeCode: 'S2', paperCode: 'P2', quantity: 200, sellingPrice: 19000 },
        ],
      });
      const result = await service.registerProduct(request);
      expect(result.success).toBe(true);
    });

    it('should handle deliveryTemplateNo undefined', async () => {
      const request = createSampleRequest({ deliveryTemplateNo: undefined });
      const result = await service.registerProduct(request);
      expect(result.success).toBe(true);
    });

    it('should handle batch with single product', async () => {
      const requests = [createSampleRequest()];
      const resultPromise = service.batchRegister(requests);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.total).toBe(1);
      expect(result.succeeded).toBe(1);
    });

    it('should handle sheetStandard undefined', async () => {
      const request = createSampleRequest({ sheetStandard: undefined });
      const result = await service.registerProduct(request);
      expect(result.success).toBe(true);
    });
  });
});
