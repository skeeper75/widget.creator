/**
 * Shopby Admin API Client
 *
 * High-level HTTP client for Shopby Admin API operations.
 * Provides product CRUD, option management, and category management
 * with built-in rate limiting, circuit breaker, and retry.
 *
 * Reference: SPEC-SHOPBY-002, R-PRD-001
 *
 * @MX:ANCHOR: Core Admin API client for all Shopby management operations
 * @MX:REASON: Central access point for product registration, options, and categories
 */

import type {
  ShopbyMallProduct,
  ShopbyProductOptionData,
  ShopbyApiResponse,
  ShopbyCategory,
  ShopbyProductListQuery,
} from './types.js';
import { AdminTokenManager } from './auth.js';
import { ADMIN_API_ENDPOINTS, RATE_LIMITS } from './api-config.js';
import { CircuitBreaker, CIRCUIT_BREAKER_CONFIGS } from '../circuit-breaker.js';
import { retryWithBackoff, RETRY_CONFIGS } from '../retry.js';

// =============================================================================
// SECTION 1: Configuration & Types
// =============================================================================

/**
 * Logger interface for admin client
 */
export interface AdminClientLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Admin client configuration
 */
export interface AdminClientConfig {
  /** Shopby Admin API base URL */
  baseUrl: string;
  /** Admin token manager for authentication */
  tokenManager: AdminTokenManager;
  /** Optional logger */
  logger?: AdminClientLogger;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Error thrown by admin API operations
 */
export class ShopbyAdminApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = 'ShopbyAdminApiError';
  }
}

// =============================================================================
// SECTION 2: Rate Limiter
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simple token-bucket rate limiter to respect Shopby Admin API limits
 */
class RateLimiter {
  private lastRequestTime = 0;
  private readonly minIntervalMs: number;

  constructor(tps: number) {
    this.minIntervalMs = Math.ceil(1000 / tps);
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestTime = Date.now();
  }
}

// =============================================================================
// SECTION 3: Admin Client
// =============================================================================

const DEFAULT_TIMEOUT = 30000;

/**
 * Shopby Admin API Client
 *
 * Provides authenticated, rate-limited access to Shopby Admin API
 * with circuit breaker and retry for resilience.
 */
export class ShopbyAdminClient {
  private readonly config: AdminClientConfig;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: AdminClientLogger;

  constructor(config: AdminClientConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIGS.shopby);
    this.rateLimiter = new RateLimiter(RATE_LIMITS.admin.tps);
    this.logger = config.logger ?? {
      info: console.log,
      error: console.error,
      warn: console.warn,
    };
  }

  // ============ Product CRUD ============

  /**
   * Create a new product in Shopby
   *
   * @param product - Full mallProduct data
   * @returns Created product number
   */
  async createProduct(product: ShopbyMallProduct): Promise<{ mallProductNo: number }> {
    return this.request<{ mallProductNo: number }>(
      'POST',
      ADMIN_API_ENDPOINTS.PRODUCTS.CREATE,
      product
    );
  }

  /**
   * Get a product by product number
   *
   * @param productNo - Shopby product number
   * @returns Product data
   */
  async getProduct(productNo: number): Promise<ShopbyMallProduct> {
    return this.request<ShopbyMallProduct>(
      'GET',
      ADMIN_API_ENDPOINTS.PRODUCTS.DETAIL(productNo)
    );
  }

  /**
   * Update an existing product
   *
   * @param productNo - Shopby product number
   * @param product - Partial product data to update
   */
  async updateProduct(productNo: number, product: Partial<ShopbyMallProduct>): Promise<void> {
    await this.request<unknown>(
      'PUT',
      ADMIN_API_ENDPOINTS.PRODUCTS.UPDATE(productNo),
      product
    );
  }

  /**
   * Delete a product
   *
   * @param productNo - Shopby product number
   */
  async deleteProduct(productNo: number): Promise<void> {
    await this.request<unknown>(
      'DELETE',
      ADMIN_API_ENDPOINTS.PRODUCTS.DELETE(productNo)
    );
  }

  /**
   * List products with optional filtering
   *
   * @param query - Optional query parameters
   * @returns Paginated product list
   */
  async listProducts(query?: ShopbyProductListQuery): Promise<ShopbyApiResponse<ShopbyMallProduct[]>> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.pageSize) params.set('pageSize', String(query.pageSize));
    if (query?.categoryNo) params.set('categoryNo', String(query.categoryNo));
    if (query?.saleStatusType) params.set('saleStatusType', query.saleStatusType);
    if (query?.keyword) params.set('keyword', query.keyword);

    const queryStr = params.toString();
    const url = ADMIN_API_ENDPOINTS.PRODUCTS.LIST + (queryStr ? `?${queryStr}` : '');
    return this.request<ShopbyApiResponse<ShopbyMallProduct[]>>('GET', url);
  }

  // ============ Option CRUD ============

  /**
   * Get product options
   *
   * @param productNo - Shopby product number
   * @returns Product option data (COMBINATION, REQUIRED, STANDARD)
   */
  async getProductOptions(productNo: number): Promise<ShopbyProductOptionData> {
    return this.request<ShopbyProductOptionData>(
      'GET',
      ADMIN_API_ENDPOINTS.PRODUCTS.OPTIONS(productNo)
    );
  }

  /**
   * Update product options
   *
   * @param productNo - Shopby product number
   * @param options - Complete option data to set
   */
  async updateProductOptions(
    productNo: number,
    options: ShopbyProductOptionData
  ): Promise<void> {
    await this.request<unknown>(
      'PUT',
      ADMIN_API_ENDPOINTS.PRODUCTS.UPDATE_OPTIONS(productNo),
      options
    );
  }

  // ============ Category CRUD ============

  /**
   * List all categories
   *
   * @returns Array of categories
   */
  async listCategories(): Promise<ShopbyCategory[]> {
    return this.request<ShopbyCategory[]>(
      'GET',
      ADMIN_API_ENDPOINTS.CATEGORIES.LIST
    );
  }

  /**
   * Get a category by number
   *
   * @param categoryNo - Shopby category number
   * @returns Category data
   */
  async getCategory(categoryNo: number): Promise<ShopbyCategory> {
    return this.request<ShopbyCategory>(
      'GET',
      ADMIN_API_ENDPOINTS.CATEGORIES.DETAIL(categoryNo)
    );
  }

  /**
   * Create a new category
   *
   * @param category - Category creation data
   * @returns Created category number
   */
  async createCategory(category: {
    categoryName: string;
    parentCategoryNo?: number;
    sortOrder?: number;
    displayable?: boolean;
  }): Promise<{ categoryNo: number }> {
    return this.request<{ categoryNo: number }>(
      'POST',
      ADMIN_API_ENDPOINTS.CATEGORIES.CREATE,
      category
    );
  }

  /**
   * Update an existing category
   *
   * @param categoryNo - Shopby category number
   * @param category - Partial category data to update
   */
  async updateCategory(
    categoryNo: number,
    category: Partial<{
      categoryName: string;
      sortOrder: number;
      displayable: boolean;
    }>
  ): Promise<void> {
    await this.request<unknown>(
      'PUT',
      ADMIN_API_ENDPOINTS.CATEGORIES.UPDATE(categoryNo),
      category
    );
  }

  // ============ Health Check ============

  /**
   * Check if the Shopby Admin API is reachable
   *
   * @returns True if healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.circuitBreaker.execute(async () => {
        await this.rateLimiter.waitForSlot();
        const token = await this.config.tokenManager.getValidToken();
        const url = `${this.config.baseUrl}${ADMIN_API_ENDPOINTS.PRODUCTS.LIST}?pageSize=1`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(this.config.timeout ?? 10000),
        });
        if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset circuit breaker state
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  // ============ Internal Request Handler ============

  // @MX:WARN: [AUTO] Nested async coordination: circuitBreaker.execute wraps retryWithBackoff wraps rateLimiter — failure in inner layer propagates through all layers
  // @MX:REASON: Three-layer nesting (circuit breaker > retry > rate limiter) with sleep() calls creates complex error propagation; 429 handling sleeps inline before re-throwing
  /**
   * Execute an authenticated, rate-limited, resilient API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    return this.circuitBreaker.execute(() =>
      retryWithBackoff(async () => {
        await this.rateLimiter.waitForSlot();

        const token = await this.config.tokenManager.getValidToken();
        const url = `${this.config.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        const options: RequestInit = {
          method,
          headers,
          signal: AbortSignal.timeout(this.config.timeout ?? DEFAULT_TIMEOUT),
        };

        if (body !== undefined && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          options.body = JSON.stringify(body);
        }

        this.logger.info(`Shopby Admin API: ${method} ${endpoint}`);

        const response = await fetch(url, options);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let parsedError: unknown;
          try {
            parsedError = JSON.parse(errorText);
          } catch {
            parsedError = errorText;
          }

          // Handle rate limiting with Retry-After header
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitMs = retryAfter ? Number(retryAfter) * 1000 : 5000;
            this.logger.warn('Rate limited by Shopby Admin API', { waitMs, endpoint });
            await sleep(waitMs);
            throw new ShopbyAdminApiError(
              `Rate limited: ${response.status}`,
              response.status,
              parsedError
            );
          }

          throw new ShopbyAdminApiError(
            `Admin API error: ${response.status} ${response.statusText}`,
            response.status,
            parsedError
          );
        }

        // Handle empty responses (204 No Content)
        const text = await response.text();
        if (!text) return undefined as T;

        return JSON.parse(text) as T;
      }, RETRY_CONFIGS.productSync)
    );
  }
}
