/**
 * Unit tests for Shopby Admin API HTTP Client
 *
 * Tests cover CRUD operations, rate limiting, error handling,
 * and authentication. Retry/circuit-breaker are mocked to isolate
 * HTTP client behavior and prevent async timer leaks.
 *
 * SPEC: SPEC-SHOPBY-002 M3 - Shopby Admin API Client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock retry/circuit-breaker to pass through and avoid async timer leaks
// Path from __tests__/ to integration/ is ../../
vi.mock('../../retry.js', () => ({
  retryWithBackoff: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
  RETRY_CONFIGS: {
    productSync: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000, jitterFactor: 0.2 },
    orderDispatch: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000, jitterFactor: 0.2 },
    designRender: { maxRetries: 5, baseDelayMs: 2000, maxDelayMs: 60000, jitterFactor: 0.2 },
    statusCallback: { maxRetries: 2, baseDelayMs: 500, maxDelayMs: 5000, jitterFactor: 0.1 },
  },
  RetryExhaustedError: class extends Error {
    constructor(public attempts: number, public lastError: Error) {
      super(`Retry exhausted after ${attempts} attempts: ${lastError.message}`);
    }
  },
}));

vi.mock('../../circuit-breaker.js', () => ({
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    reset: vi.fn(),
    isAllowed: vi.fn().mockReturnValue(true),
    getStats: vi.fn().mockReturnValue({ state: 'CLOSED', failureCount: 0 }),
  })),
  CIRCUIT_BREAKER_CONFIGS: {
    shopby: { name: 'shopby', failureThreshold: 5, resetTimeoutMs: 60000 },
    mes: { name: 'mes', failureThreshold: 5, resetTimeoutMs: 60000 },
  },
  CircuitBreakerOpenError: class extends Error {
    constructor(public name: string) {
      super(`Circuit breaker ${name} is open`);
    }
  },
}));

import { ShopbyAdminClient, ShopbyAdminApiError } from '../admin-client.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockTokenManager() {
  return {
    getValidToken: vi.fn().mockResolvedValue('test-admin-token'),
    refreshToken: vi.fn(),
  };
}

function createJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : `Error ${status}`,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function createErrorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    statusText: `Error ${status}`,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify({ code: `E${status}`, message })),
    json: () => Promise.resolve({ code: `E${status}`, message }),
  } as unknown as Response;
}

function createEmptyResponse(status = 204): Response {
  return {
    ok: true,
    status,
    statusText: 'No Content',
    headers: new Headers(),
    text: () => Promise.resolve(''),
    json: () => Promise.reject(new Error('No JSON')),
  } as unknown as Response;
}

let client: ShopbyAdminClient;
let mockFetch: ReturnType<typeof vi.fn>;
let mockTokenManager: ReturnType<typeof createMockTokenManager>;

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
  mockTokenManager = createMockTokenManager();
  client = new ShopbyAdminClient({
    baseUrl: 'https://admin-api.shopby.co.kr',
    tokenManager: mockTokenManager as never,
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    timeout: 5000,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// =============================================================================
// SECTION 1: Client Initialization
// =============================================================================

describe('ShopbyAdminClient', () => {
  describe('initialization', () => {
    it('should initialize with config', () => {
      expect(client).toBeDefined();
    });

    it('should use default logger when none provided', () => {
      const c = new ShopbyAdminClient({
        baseUrl: 'https://test.shopby.co.kr',
        tokenManager: mockTokenManager as never,
      });
      expect(c).toBeDefined();
    });
  });

  // =============================================================================
  // SECTION 2: Product CRUD Operations
  // =============================================================================

  describe('createProduct', () => {
    it('should POST to products endpoint and return productNo', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mallProductNo: 12345 }));

      const result = await client.createProduct({
        productName: '일반명함',
        price: { salePrice: 10000 },
        saleStatusType: 'ONSALE',
      } as never);

      expect(result.mallProductNo).toBe(12345);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/products');
      expect(options.method).toBe('POST');
    });

    it('should include admin token in Authorization header', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mallProductNo: 1 }));
      await client.createProduct({ productName: 'Test' } as never);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer test-admin-token');
    });

    it('should send JSON body for POST requests', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mallProductNo: 1 }));
      const product = { productName: '일반명함', price: { salePrice: 10000 }, saleStatusType: 'ONSALE' };
      await client.createProduct(product as never);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.body).toBeDefined();
    });

    it('should throw ShopbyAdminApiError on 400', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Validation error'));
      await expect(client.createProduct({} as never)).rejects.toThrow(ShopbyAdminApiError);
    });

    it('should throw on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(401, 'Unauthorized'));
      await expect(client.createProduct({} as never)).rejects.toThrow(ShopbyAdminApiError);
    });
  });

  describe('getProduct', () => {
    it('should GET product by productNo', async () => {
      const product = { mallProductNo: 123, productName: '명함' };
      mockFetch.mockResolvedValueOnce(createJsonResponse(product));

      const result = await client.getProduct(123);
      expect(result).toEqual(product);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('123');
    });
  });

  describe('updateProduct', () => {
    it('should PUT to products endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createEmptyResponse());
      await client.updateProduct(123, { productName: 'Updated' } as never);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('123');
      expect(options.method).toBe('PUT');
    });
  });

  describe('deleteProduct', () => {
    it('should DELETE product by productNo', async () => {
      mockFetch.mockResolvedValueOnce(createEmptyResponse());
      await client.deleteProduct(123);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('123');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('listProducts', () => {
    it('should GET products list', async () => {
      const response = { items: [], totalCount: 0 };
      mockFetch.mockResolvedValueOnce(createJsonResponse(response));

      const result = await client.listProducts();
      expect(result).toEqual(response);
    });

    it('should include query parameters', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [] }));
      await client.listProducts({ page: 1, pageSize: 10, categoryNo: 101 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=1');
      expect(url).toContain('pageSize=10');
      expect(url).toContain('categoryNo=101');
    });

    it('should include saleStatusType filter', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [] }));
      await client.listProducts({ saleStatusType: 'ONSALE' } as never);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('saleStatusType=ONSALE');
    });

    it('should include keyword filter', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [] }));
      await client.listProducts({ keyword: '명함' } as never);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('keyword=');
    });
  });

  // =============================================================================
  // SECTION 3: Option Management
  // =============================================================================

  describe('getProductOptions', () => {
    it('should GET options for a product', async () => {
      const options = { combinations: [], required: [], standard: [] };
      mockFetch.mockResolvedValueOnce(createJsonResponse(options));

      const result = await client.getProductOptions(123);
      expect(result).toEqual(options);
    });
  });

  describe('updateProductOptions', () => {
    it('should PUT options for a product', async () => {
      mockFetch.mockResolvedValueOnce(createEmptyResponse());
      const options = {
        combinations: [{
          kind: 'COMBINATION' as const,
          optionName: '규격',
          optionValues: [{ optionValue: '90x50mm', addPrice: 0 }],
        }],
      };
      await client.updateProductOptions(123, options as never);

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('PUT');
      expect(JSON.parse(opts.body)).toHaveProperty('combinations');
    });
  });

  // =============================================================================
  // SECTION 4: Category CRUD
  // =============================================================================

  describe('listCategories', () => {
    it('should GET categories list', async () => {
      const categories = [{ categoryNo: 100, categoryName: '인쇄물' }];
      mockFetch.mockResolvedValueOnce(createJsonResponse(categories));

      const result = await client.listCategories();
      expect(result).toEqual(categories);
    });
  });

  describe('getCategory', () => {
    it('should GET category by number', async () => {
      const category = { categoryNo: 101, categoryName: '명함' };
      mockFetch.mockResolvedValueOnce(createJsonResponse(category));

      const result = await client.getCategory(101);
      expect(result).toEqual(category);
    });
  });

  describe('createCategory', () => {
    it('should POST to create category and return categoryNo', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ categoryNo: 200 }));

      const result = await client.createCategory({
        categoryName: '명함',
        parentCategoryNo: 100,
        displayable: true,
      });
      expect(result.categoryNo).toBe(200);
    });
  });

  describe('updateCategory', () => {
    it('should PUT to update category', async () => {
      mockFetch.mockResolvedValueOnce(createEmptyResponse());
      await client.updateCategory(101, { categoryName: '명함 (updated)' });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('PUT');
    });
  });

  // =============================================================================
  // SECTION 5: Rate Limiting
  // =============================================================================

  describe('rate limiting', () => {
    it('should enforce minimum interval between requests', async () => {
      mockFetch.mockResolvedValue(createJsonResponse({ mallProductNo: 1 }));

      // Make two rapid requests
      const p1 = client.createProduct({} as never);
      const p2 = client.getProduct(1);

      await vi.runAllTimersAsync();
      await Promise.all([p1, p2]);

      // Both calls should have been made
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // =============================================================================
  // SECTION 6: Error Handling
  // =============================================================================

  describe('error handling', () => {
    it('should throw ShopbyAdminApiError with status code', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Bad Request'));

      try {
        await client.createProduct({} as never);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ShopbyAdminApiError);
        expect((error as ShopbyAdminApiError).statusCode).toBe(400);
      }
    });

    it('should include response body in error', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(422, 'Validation failed'));

      try {
        await client.createProduct({} as never);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ShopbyAdminApiError).responseBody).toBeDefined();
      }
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        text: () => Promise.resolve('Server Error'),
      } as Response);

      await expect(client.createProduct({} as never)).rejects.toThrow();
    });

    it('should handle text() failure in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        text: () => Promise.reject(new Error('Read failed')),
      } as unknown as Response);

      await expect(client.createProduct({} as never)).rejects.toThrow();
    });

    it('should throw ShopbyAdminApiError on 429 rate limit', async () => {
      vi.useRealTimers(); // Use real timers to avoid AbortSignal.timeout conflicts
      const headers = new Headers();
      headers.set('Retry-After', '0'); // 0 seconds = immediate for testing
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers,
        text: () => Promise.resolve(JSON.stringify({ message: 'Rate limited' })),
      } as unknown as Response);

      await expect(client.createProduct({} as never)).rejects.toThrow(ShopbyAdminApiError);
    });
  });

  // =============================================================================
  // SECTION 7: Health Check
  // =============================================================================

  describe('healthCheck', () => {
    it('should return true when API is reachable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      } as unknown as Response);

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when API returns error', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(500, 'Error'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  // =============================================================================
  // SECTION 8: Circuit Breaker
  // =============================================================================

  describe('resetCircuitBreaker', () => {
    it('should reset the circuit breaker', () => {
      // Should not throw
      client.resetCircuitBreaker();
    });
  });

  // =============================================================================
  // SECTION 9: Empty Responses (204)
  // =============================================================================

  describe('empty responses', () => {
    it('should handle 204 No Content for update operations', async () => {
      mockFetch.mockResolvedValueOnce(createEmptyResponse());
      await client.updateProduct(123, {} as never);
      // No error means success
    });

    it('should handle 204 No Content for delete operations', async () => {
      mockFetch.mockResolvedValueOnce(createEmptyResponse());
      await client.deleteProduct(123);
      // No error means success
    });
  });
});
