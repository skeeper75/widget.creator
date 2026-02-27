/**
 * Shopby API Configuration
 *
 * API endpoints, rate limits, and configuration constants.
 * Reference: SPEC-SHOPBY-001, SPEC-SHOPBY-INTEGRATION-DESIGN
 *
 * @MX:NOTE: Contains all Shopby API endpoint constants and configuration.
 * Supports Shop API, Admin API, Server API, and Internal API categories.
 */

import type { ShopbyApiConfig, ShopbyApiCategory, ShopbyApiConfigMap } from './types.js';

// =============================================================================
// SECTION 1: API Base URLs
// =============================================================================

/**
 * Shopby API base URLs by environment
 */
export const SHOPBY_BASE_URLS = {
  /** Production environment */
  production: {
    shop: 'https://api.shopby.co.kr/shop/v1',
    admin: 'https://api.shopby.co.kr/admin/v1',
    server: 'https://api.shopby.co.kr/server/v1',
    internal: 'https://api.shopby.co.kr/internal/v1',
  },
  /** Sandbox/Testing environment */
  sandbox: {
    shop: 'https://sandbox-api.shopby.co.kr/shop/v1',
    admin: 'https://sandbox-api.shopby.co.kr/admin/v1',
    server: 'https://sandbox-api.shopby.co.kr/server/v1',
    internal: 'https://sandbox-api.shopby.co.kr/internal/v1',
  },
} as const;

/**
 * API environment type
 */
export type ShopbyEnvironment = keyof typeof SHOPBY_BASE_URLS;

// =============================================================================
// SECTION 2: Shop API Endpoints
// =============================================================================

/**
 * Shop API endpoint paths (customer-facing)
 */
export const SHOP_API_ENDPOINTS = {
  // Authentication
  AUTH: {
    TOKEN: '/auth/token',
    REFRESH: '/auth/token/refresh',
    SOCIAL: (provider: string) => `/auth/social/${provider}`,
    LOGOUT: '/auth/logout',
  },

  // Products
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (productNo: number) => `/products/${productNo}`,
    OPTIONS: (productNo: number) => `/products/${productNo}/options`,
    RELATED: (productNo: number) => `/products/${productNo}/related`,
    SEARCH: '/products/search',
  },

  // Categories (Product Sections)
  CATEGORIES: {
    LIST: '/product-sections',
    DETAIL: (sectionNo: number) => `/product-sections/${sectionNo}`,
    PRODUCTS: (sectionNo: number) => `/product-sections/${sectionNo}/products`,
  },

  // Cart
  CART: {
    GET: '/cart',
    ADD: '/cart',
    UPDATE: (cartNo: number) => `/cart/${cartNo}`,
    DELETE: (cartNo: number) => `/cart/${cartNo}`,
    CLEAR: '/cart/clear',
  },

  // Orders
  ORDERS: {
    CREATE_SHEET: '/order-sheets',
    SHEET_DETAIL: (sheetNo: string) => `/order-sheets/${sheetNo}`,
    CALCULATE: (sheetNo: string) => `/order-sheets/${sheetNo}/calculate`,
    LIST: '/orders',
    DETAIL: (orderNo: string) => `/orders/${orderNo}`,
  },

  // Payments
  PAYMENTS: {
    RESERVE: '/payments/reserve',
    CONFIRM: '/payments/confirm',
    CANCEL: (paymentNo: string) => `/payments/${paymentNo}/cancel`,
  },

  // Storage/File Upload
  STORAGE: {
    TEMPORARY_IMAGES: '/storage/temporary-images',
  },

  // Member/Profile
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
    ADDRESSES: '/profile/addresses',
  },
} as const;

// =============================================================================
// SECTION 3: Admin API Endpoints
// =============================================================================

/**
 * Admin API endpoint paths (management)
 */
export const ADMIN_API_ENDPOINTS = {
  // Products
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    DETAIL: (productNo: number) => `/products/${productNo}`,
    UPDATE: (productNo: number) => `/products/${productNo}`,
    DELETE: (productNo: number) => `/products/${productNo}`,
    OPTIONS: (productNo: number) => `/products/${productNo}/options`,
    UPDATE_OPTIONS: (productNo: number) => `/products/${productNo}/options`,
  },

  // Orders
  ORDERS: {
    LIST: '/orders',
    DETAIL: (orderNo: string) => `/orders/${orderNo}`,
    UPDATE_STATUS: (orderNo: string) => `/orders/${orderNo}/status`,
    UPDATE_DELIVERY: (orderNo: string) => `/orders/${orderNo}/delivery`,
    CANCEL: (orderNo: string) => `/orders/${orderNo}/cancel`,
  },

  // Claims
  CLAIMS: {
    LIST: '/claims',
    DETAIL: (claimNo: string) => `/claims/${claimNo}`,
    CREATE: '/claims',
  },

  // Members
  MEMBERS: {
    LIST: '/members',
    DETAIL: (memberNo: number) => `/members/${memberNo}`,
    UPDATE: (memberNo: number) => `/members/${memberNo}`,
  },

  // Delivery Templates
  DELIVERY_TEMPLATES: {
    LIST: '/delivery-templates',
    DETAIL: (templateNo: number) => `/delivery-templates/${templateNo}`,
    CREATE: '/delivery-templates',
    UPDATE: (templateNo: number) => `/delivery-templates/${templateNo}`,
  },

  // Categories
  CATEGORIES: {
    LIST: '/categories',
    DETAIL: (categoryNo: number) => `/categories/${categoryNo}`,
    CREATE: '/categories',
    UPDATE: (categoryNo: number) => `/categories/${categoryNo}`,
  },

  // Dashboard/Statistics
  DASHBOARD: {
    SALES: '/dashboard/sales',
    ORDERS: '/dashboard/orders',
    PRODUCTS: '/dashboard/products',
  },
} as const;

// =============================================================================
// SECTION 4: Server API Endpoints
// =============================================================================

/**
 * Server API endpoint paths (server-to-server)
 */
export const SERVER_API_ENDPOINTS = {
  // Authentication
  AUTH: {
    TOKEN: '/auth/token',
    VALIDATE: '/auth/validate',
  },

  // Order Synchronization
  ORDERS: {
    SYNC: '/orders/sync',
    STATUS_CALLBACK: '/orders/status-callback',
  },

  // Product Synchronization
  PRODUCTS: {
    SYNC: '/products/sync',
    BULK_CREATE: '/products/bulk',
  },
} as const;

// =============================================================================
// SECTION 5: Rate Limit Configuration
// =============================================================================

/**
 * Rate limit configuration by API category
 */
export const RATE_LIMITS = {
  /** Shop API rate limits */
  shop: {
    /** Requests per second */
    tps: 50,
    /** Requests per minute */
    rpm: 1000,
    /** Requests per hour */
    rph: 30000,
  },
  /** Admin API rate limits */
  admin: {
    tps: 20,
    rpm: 500,
    rph: 10000,
  },
  /** Server API rate limits */
  server: {
    tps: 100,
    rpm: 2000,
    rph: 50000,
  },
  /** Internal API rate limits */
  internal: {
    tps: 200,
    rpm: 5000,
    rph: 100000,
  },
} as const;

/**
 * File upload limits
 */
export const FILE_UPLOAD_LIMITS = {
  /** Maximum image size (bytes) - 12MB */
  MAX_IMAGE_SIZE: 12 * 1024 * 1024,
  /** Allowed image types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  /** Maximum file name length */
  MAX_FILENAME_LENGTH: 255,
} as const;

// =============================================================================
// SECTION 6: Request Configuration
// =============================================================================

/**
 * Default request configuration
 */
export const DEFAULT_REQUEST_CONFIG = {
  /** Request timeout in milliseconds */
  timeout: 30000,
  /** Maximum retries for failed requests */
  maxRetries: 3,
  /** Delay between retries in milliseconds */
  retryDelay: 1000,
  /** Default headers */
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION_DEFAULTS = {
  /** Default page size */
  pageSize: 20,
  /** Maximum page size */
  maxPageSize: 100,
  /** Default page number */
  pageNumber: 1,
} as const;

// =============================================================================
// SECTION 7: Configuration Factory
// =============================================================================

/**
 * API configuration options
 */
export interface ShopbyConfigOptions {
  /** API environment */
  environment?: ShopbyEnvironment;
  /** API key for authentication */
  apiKey?: string;
  /** Partner ID */
  partnerId?: string;
  /** Mall ID */
  mallId?: string;
  /** Custom base URLs (override defaults) */
  customUrls?: Partial<Record<ShopbyApiCategory, string>>;
  /** Request timeout override */
  timeout?: number;
}

/**
 * Create API configuration for specified environment
 *
 * @MX:ANCHOR: Factory function for Shopby API configuration
 * @MX:REASON: Provides consistent configuration across API clients
 *
 * @param options - Configuration options
 * @returns Complete API configuration map
 */
export function createApiConfig(options: ShopbyConfigOptions = {}): ShopbyApiConfigMap {
  const env = options.environment ?? 'production';
  const baseUrls = SHOPBY_BASE_URLS[env];

  return {
    shop: {
      baseUrl: options.customUrls?.shop ?? baseUrls.shop,
      apiKey: options.apiKey,
      partnerId: options.partnerId,
      mallId: options.mallId,
    },
    admin: {
      baseUrl: options.customUrls?.admin ?? baseUrls.admin,
      apiKey: options.apiKey,
      partnerId: options.partnerId,
      mallId: options.mallId,
    },
    server: options.customUrls?.server || baseUrls.server ? {
      baseUrl: options.customUrls?.server ?? baseUrls.server,
      apiKey: options.apiKey,
      partnerId: options.partnerId,
      mallId: options.mallId,
    } : undefined,
    internal: options.customUrls?.internal || baseUrls.internal ? {
      baseUrl: options.customUrls?.internal ?? baseUrls.internal,
      apiKey: options.apiKey,
      partnerId: options.partnerId,
      mallId: options.mallId,
    } : undefined,
  };
}

/**
 * Create configuration for a single API category
 *
 * @param category - API category
 * @param options - Configuration options
 * @returns API configuration for the category
 */
export function createCategoryConfig(
  category: ShopbyApiCategory,
  options: ShopbyConfigOptions = {}
): ShopbyApiConfig {
  const configMap = createApiConfig(options);
  const config = configMap[category];

  if (!config) {
    throw new Error(`Invalid API category: ${category}`);
  }

  return config;
}

// =============================================================================
// SECTION 8: Endpoint URL Builder
// =============================================================================

/**
 * Build full API URL
 *
 * @param baseUrl - API base URL
 * @param endpoint - Endpoint path
 * @param params - Optional path parameters
 * @returns Full URL
 */
export function buildApiUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string | number>
): string {
  let url = `${baseUrl}${endpoint}`;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, String(value));
    });
  }

  return url;
}

/**
 * Build URL with query parameters
 *
 * @param baseUrl - Base URL
 * @param queryParams - Query parameters
 * @returns URL with query string
 */
export function buildUrlWithQuery(
  baseUrl: string,
  queryParams?: Record<string, string | number | boolean | undefined>
): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

// =============================================================================
// SECTION 9: API Domain Lists
// =============================================================================

/**
 * Shop API domains (12 domains)
 */
export const SHOP_API_DOMAINS = [
  'auth',
  'products',
  'product-sections',
  'cart',
  'order-sheets',
  'orders',
  'payments',
  'profile',
  'storage',
  'coupons',
  'points',
  'reviews',
] as const;

/**
 * Admin API domains (25 domains)
 */
export const ADMIN_API_DOMAINS = [
  'products',
  'orders',
  'members',
  'delivery-templates',
  'categories',
  'coupons',
  'claims',
  'reviews',
  'points',
  'mileage',
  'notifications',
  'banners',
  'popups',
  'planning-display',
  'seo',
  'statistics',
  'settlements',
  'partners',
  'operators',
  'menus',
  'skins',
  'apps',
  'integrations',
  'logs',
  'settings',
] as const;

/**
 * Server API domains (12 domains)
 */
export const SERVER_API_DOMAINS = [
  'auth',
  'orders',
  'products',
  'inventory',
  'members',
  'payments',
  'delivery',
  'webhooks',
  'sync',
  'batch',
  'health',
  'metrics',
] as const;

/**
 * Internal API domains (31 domains)
 */
export const INTERNAL_API_DOMAINS = [
  'auth',
  'cache',
  'config',
  'features',
  'jobs',
  'locks',
  'metrics',
  'queues',
  'secrets',
  'sessions',
  'storage',
  'tasks',
  'tokens',
  'users',
  'audit',
  'billing',
  'compliance',
  'encryption',
  'events',
  'integrations',
  'limits',
  'migrations',
  'notifications',
  'permissions',
  'policies',
  'replication',
  'routing',
  'scaling',
  'secrets-management',
  'tracing',
  'validation',
] as const;

// =============================================================================
// SECTION 10: Environment Detection
// =============================================================================

/**
 * Detect environment from hostname
 *
 * @param hostname - Current hostname
 * @returns Detected environment
 */
export function detectEnvironment(hostname: string): ShopbyEnvironment {
  if (hostname.includes('sandbox') || hostname.includes('staging') || hostname.includes('test')) {
    return 'sandbox';
  }
  return 'production';
}

/**
 * Check if running in sandbox environment
 *
 * @param config - API configuration
 * @returns True if sandbox
 */
export function isSandboxEnvironment(config: ShopbyApiConfig): boolean {
  return config.baseUrl.includes('sandbox') || config.baseUrl.includes('staging');
}
