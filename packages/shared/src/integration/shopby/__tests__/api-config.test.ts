/**
 * Unit tests for Shopby API Configuration
 *
 * Tests cover base URLs, endpoints, rate limits, configuration
 * factory functions, URL builders, and environment detection.
 */
import { describe, it, expect } from 'vitest';
import {
  SHOPBY_BASE_URLS,
  SHOP_API_ENDPOINTS,
  ADMIN_API_ENDPOINTS,
  SERVER_API_ENDPOINTS,
  RATE_LIMITS,
  FILE_UPLOAD_LIMITS,
  DEFAULT_REQUEST_CONFIG,
  PAGINATION_DEFAULTS,
  createApiConfig,
  createCategoryConfig,
  buildApiUrl,
  buildUrlWithQuery,
  SHOP_API_DOMAINS,
  ADMIN_API_DOMAINS,
  SERVER_API_DOMAINS,
  INTERNAL_API_DOMAINS,
  detectEnvironment,
  isSandboxEnvironment,
} from '../api-config.js';

// =============================================================================
// SECTION 1: Base URLs Tests
// =============================================================================

describe('SHOPBY_BASE_URLS', () => {
  describe('production', () => {
    it('should have shop URL', () => {
      expect(SHOPBY_BASE_URLS.production.shop).toBe('https://api.shopby.co.kr/shop/v1');
    });

    it('should have admin URL', () => {
      expect(SHOPBY_BASE_URLS.production.admin).toBe('https://api.shopby.co.kr/admin/v1');
    });

    it('should have server URL', () => {
      expect(SHOPBY_BASE_URLS.production.server).toBe('https://api.shopby.co.kr/server/v1');
    });

    it('should have internal URL', () => {
      expect(SHOPBY_BASE_URLS.production.internal).toBe('https://api.shopby.co.kr/internal/v1');
    });
  });

  describe('sandbox', () => {
    it('should have sandbox shop URL', () => {
      expect(SHOPBY_BASE_URLS.sandbox.shop).toBe('https://sandbox-api.shopby.co.kr/shop/v1');
    });

    it('should have sandbox admin URL', () => {
      expect(SHOPBY_BASE_URLS.sandbox.admin).toBe('https://sandbox-api.shopby.co.kr/admin/v1');
    });
  });
});

// =============================================================================
// SECTION 2: Shop API Endpoints Tests
// =============================================================================

describe('SHOP_API_ENDPOINTS', () => {
  describe('AUTH', () => {
    it('should have TOKEN endpoint', () => {
      expect(SHOP_API_ENDPOINTS.AUTH.TOKEN).toBe('/auth/token');
    });

    it('should have REFRESH endpoint', () => {
      expect(SHOP_API_ENDPOINTS.AUTH.REFRESH).toBe('/auth/token/refresh');
    });

    it('should have SOCIAL endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.AUTH.SOCIAL('naver')).toBe('/auth/social/naver');
    });
  });

  describe('PRODUCTS', () => {
    it('should have LIST endpoint', () => {
      expect(SHOP_API_ENDPOINTS.PRODUCTS.LIST).toBe('/products');
    });

    it('should have DETAIL endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.PRODUCTS.DETAIL(12345)).toBe('/products/12345');
    });

    it('should have OPTIONS endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.PRODUCTS.OPTIONS(12345)).toBe('/products/12345/options');
    });

    it('should have RELATED endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.PRODUCTS.RELATED(12345)).toBe('/products/12345/related');
    });

    it('should have SEARCH endpoint', () => {
      expect(SHOP_API_ENDPOINTS.PRODUCTS.SEARCH).toBe('/products/search');
    });
  });

  describe('CATEGORIES', () => {
    it('should have LIST endpoint', () => {
      expect(SHOP_API_ENDPOINTS.CATEGORIES.LIST).toBe('/product-sections');
    });

    it('should have PRODUCTS endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.CATEGORIES.PRODUCTS(100)).toBe('/product-sections/100/products');
    });
  });

  describe('CART', () => {
    it('should have GET endpoint', () => {
      expect(SHOP_API_ENDPOINTS.CART.GET).toBe('/cart');
    });

    it('should have DELETE endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.CART.DELETE(1)).toBe('/cart/1');
    });

    it('should have CLEAR endpoint', () => {
      expect(SHOP_API_ENDPOINTS.CART.CLEAR).toBe('/cart/clear');
    });
  });

  describe('ORDERS', () => {
    it('should have CREATE_SHEET endpoint', () => {
      expect(SHOP_API_ENDPOINTS.ORDERS.CREATE_SHEET).toBe('/order-sheets');
    });

    it('should have CALCULATE endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.ORDERS.CALCULATE('sheet-123')).toBe('/order-sheets/sheet-123/calculate');
    });

    it('should have DETAIL endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.ORDERS.DETAIL('ORD-001')).toBe('/orders/ORD-001');
    });
  });

  describe('PAYMENTS', () => {
    it('should have RESERVE endpoint', () => {
      expect(SHOP_API_ENDPOINTS.PAYMENTS.RESERVE).toBe('/payments/reserve');
    });

    it('should have CANCEL endpoint function', () => {
      expect(SHOP_API_ENDPOINTS.PAYMENTS.CANCEL('pay-123')).toBe('/payments/pay-123/cancel');
    });
  });

  describe('STORAGE', () => {
    it('should have TEMPORARY_IMAGES endpoint', () => {
      expect(SHOP_API_ENDPOINTS.STORAGE.TEMPORARY_IMAGES).toBe('/storage/temporary-images');
    });
  });
});

// =============================================================================
// SECTION 3: Admin API Endpoints Tests
// =============================================================================

describe('ADMIN_API_ENDPOINTS', () => {
  describe('PRODUCTS', () => {
    it('should have CREATE endpoint', () => {
      expect(ADMIN_API_ENDPOINTS.PRODUCTS.CREATE).toBe('/products');
    });

    it('should have UPDATE endpoint function', () => {
      expect(ADMIN_API_ENDPOINTS.PRODUCTS.UPDATE(12345)).toBe('/products/12345');
    });

    it('should have DELETE endpoint function', () => {
      expect(ADMIN_API_ENDPOINTS.PRODUCTS.DELETE(12345)).toBe('/products/12345');
    });
  });

  describe('ORDERS', () => {
    it('should have UPDATE_STATUS endpoint function', () => {
      expect(ADMIN_API_ENDPOINTS.ORDERS.UPDATE_STATUS('ORD-001')).toBe('/orders/ORD-001/status');
    });

    it('should have UPDATE_DELIVERY endpoint function', () => {
      expect(ADMIN_API_ENDPOINTS.ORDERS.UPDATE_DELIVERY('ORD-001')).toBe('/orders/ORD-001/delivery');
    });

    it('should have CANCEL endpoint function', () => {
      expect(ADMIN_API_ENDPOINTS.ORDERS.CANCEL('ORD-001')).toBe('/orders/ORD-001/cancel');
    });
  });

  describe('DELIVERY_TEMPLATES', () => {
    it('should have LIST endpoint', () => {
      expect(ADMIN_API_ENDPOINTS.DELIVERY_TEMPLATES.LIST).toBe('/delivery-templates');
    });

    it('should have CREATE endpoint', () => {
      expect(ADMIN_API_ENDPOINTS.DELIVERY_TEMPLATES.CREATE).toBe('/delivery-templates');
    });
  });

  describe('DASHBOARD', () => {
    it('should have SALES endpoint', () => {
      expect(ADMIN_API_ENDPOINTS.DASHBOARD.SALES).toBe('/dashboard/sales');
    });
  });
});

// =============================================================================
// SECTION 4: Server API Endpoints Tests
// =============================================================================

describe('SERVER_API_ENDPOINTS', () => {
  describe('AUTH', () => {
    it('should have TOKEN endpoint', () => {
      expect(SERVER_API_ENDPOINTS.AUTH.TOKEN).toBe('/auth/token');
    });

    it('should have VALIDATE endpoint', () => {
      expect(SERVER_API_ENDPOINTS.AUTH.VALIDATE).toBe('/auth/validate');
    });
  });

  describe('ORDERS', () => {
    it('should have SYNC endpoint', () => {
      expect(SERVER_API_ENDPOINTS.ORDERS.SYNC).toBe('/orders/sync');
    });

    it('should have STATUS_CALLBACK endpoint', () => {
      expect(SERVER_API_ENDPOINTS.ORDERS.STATUS_CALLBACK).toBe('/orders/status-callback');
    });
  });

  describe('PRODUCTS', () => {
    it('should have SYNC endpoint', () => {
      expect(SERVER_API_ENDPOINTS.PRODUCTS.SYNC).toBe('/products/sync');
    });

    it('should have BULK_CREATE endpoint', () => {
      expect(SERVER_API_ENDPOINTS.PRODUCTS.BULK_CREATE).toBe('/products/bulk');
    });
  });
});

// =============================================================================
// SECTION 5: Rate Limits Tests
// =============================================================================

describe('RATE_LIMITS', () => {
  describe('shop', () => {
    it('should have TPS limit of 50', () => {
      expect(RATE_LIMITS.shop.tps).toBe(50);
    });

    it('should have RPM limit of 1000', () => {
      expect(RATE_LIMITS.shop.rpm).toBe(1000);
    });

    it('should have RPH limit of 30000', () => {
      expect(RATE_LIMITS.shop.rph).toBe(30000);
    });
  });

  describe('admin', () => {
    it('should have lower limits than shop', () => {
      expect(RATE_LIMITS.admin.tps).toBeLessThan(RATE_LIMITS.shop.tps);
      expect(RATE_LIMITS.admin.rpm).toBeLessThan(RATE_LIMITS.shop.rpm);
    });
  });

  describe('server', () => {
    it('should have higher TPS than shop', () => {
      expect(RATE_LIMITS.server.tps).toBeGreaterThan(RATE_LIMITS.shop.tps);
    });
  });

  describe('internal', () => {
    it('should have highest limits', () => {
      expect(RATE_LIMITS.internal.tps).toBeGreaterThan(RATE_LIMITS.server.tps);
    });
  });
});

// =============================================================================
// SECTION 6: File Upload Limits Tests
// =============================================================================

describe('FILE_UPLOAD_LIMITS', () => {
  it('should have MAX_IMAGE_SIZE of 12MB', () => {
    expect(FILE_UPLOAD_LIMITS.MAX_IMAGE_SIZE).toBe(12 * 1024 * 1024);
  });

  it('should have ALLOWED_IMAGE_TYPES', () => {
    expect(FILE_UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
    expect(FILE_UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/png');
    expect(FILE_UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/gif');
    expect(FILE_UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/webp');
  });

  it('should have MAX_FILENAME_LENGTH of 255', () => {
    expect(FILE_UPLOAD_LIMITS.MAX_FILENAME_LENGTH).toBe(255);
  });
});

// =============================================================================
// SECTION 7: Request Configuration Tests
// =============================================================================

describe('DEFAULT_REQUEST_CONFIG', () => {
  it('should have timeout of 30000ms', () => {
    expect(DEFAULT_REQUEST_CONFIG.timeout).toBe(30000);
  });

  it('should have maxRetries of 3', () => {
    expect(DEFAULT_REQUEST_CONFIG.maxRetries).toBe(3);
  });

  it('should have retryDelay of 1000ms', () => {
    expect(DEFAULT_REQUEST_CONFIG.retryDelay).toBe(1000);
  });

  it('should have Content-Type header', () => {
    expect(DEFAULT_REQUEST_CONFIG.headers['Content-Type']).toBe('application/json');
  });

  it('should have Accept header', () => {
    expect(DEFAULT_REQUEST_CONFIG.headers['Accept']).toBe('application/json');
  });
});

describe('PAGINATION_DEFAULTS', () => {
  it('should have pageSize of 20', () => {
    expect(PAGINATION_DEFAULTS.pageSize).toBe(20);
  });

  it('should have maxPageSize of 100', () => {
    expect(PAGINATION_DEFAULTS.maxPageSize).toBe(100);
  });

  it('should have pageNumber of 1', () => {
    expect(PAGINATION_DEFAULTS.pageNumber).toBe(1);
  });
});

// =============================================================================
// SECTION 8: Configuration Factory Tests
// =============================================================================

describe('createApiConfig', () => {
  it('should create production config by default', () => {
    const config = createApiConfig();

    expect(config.shop.baseUrl).toContain('api.shopby.co.kr');
    expect(config.admin.baseUrl).toContain('api.shopby.co.kr');
  });

  it('should create sandbox config when specified', () => {
    const config = createApiConfig({ environment: 'sandbox' });

    expect(config.shop.baseUrl).toContain('sandbox-api.shopby.co.kr');
    expect(config.admin.baseUrl).toContain('sandbox-api.shopby.co.kr');
  });

  it('should include apiKey in all categories', () => {
    const config = createApiConfig({ apiKey: 'test-key' });

    expect(config.shop.apiKey).toBe('test-key');
    expect(config.admin.apiKey).toBe('test-key');
  });

  it('should include partnerId in all categories', () => {
    const config = createApiConfig({ partnerId: 'partner-001' });

    expect(config.shop.partnerId).toBe('partner-001');
    expect(config.admin.partnerId).toBe('partner-001');
  });

  it('should include mallId in all categories', () => {
    const config = createApiConfig({ mallId: 'mall-001' });

    expect(config.shop.mallId).toBe('mall-001');
    expect(config.admin.mallId).toBe('mall-001');
  });

  it('should allow custom URLs override', () => {
    const config = createApiConfig({
      customUrls: {
        shop: 'https://custom.shop.com/api',
      },
    });

    expect(config.shop.baseUrl).toBe('https://custom.shop.com/api');
    expect(config.admin.baseUrl).toContain('api.shopby.co.kr');
  });
});

describe('createCategoryConfig', () => {
  it('should create config for shop category', () => {
    const config = createCategoryConfig('shop');

    expect(config.baseUrl).toContain('/shop/v1');
  });

  it('should create config for admin category', () => {
    const config = createCategoryConfig('admin');

    expect(config.baseUrl).toContain('/admin/v1');
  });

  it('should throw for invalid category', () => {
    expect(() => createCategoryConfig('invalid' as any)).toThrow('Invalid API category');
  });
});

// =============================================================================
// SECTION 9: URL Builder Tests
// =============================================================================

describe('buildApiUrl', () => {
  it('should combine base URL and endpoint', () => {
    const url = buildApiUrl('https://api.example.com', '/products');

    expect(url).toBe('https://api.example.com/products');
  });

  it('should replace path parameters', () => {
    const url = buildApiUrl(
      'https://api.example.com',
      '/products/{id}/options',
      { id: 123 }
    );

    expect(url).toBe('https://api.example.com/products/123/options');
  });

  it('should replace multiple path parameters', () => {
    const url = buildApiUrl(
      'https://api.example.com',
      '/products/{productId}/options/{optionId}',
      { productId: 123, optionId: 456 }
    );

    expect(url).toBe('https://api.example.com/products/123/options/456');
  });

  it('should handle numeric parameters', () => {
    const url = buildApiUrl(
      'https://api.example.com',
      '/orders/{orderNo}',
      { orderNo: 'ORD-001' }
    );

    expect(url).toBe('https://api.example.com/orders/ORD-001');
  });
});

describe('buildUrlWithQuery', () => {
  it('should return base URL when no params', () => {
    const url = buildUrlWithQuery('https://api.example.com/products');

    expect(url).toBe('https://api.example.com/products');
  });

  it('should add query parameters', () => {
    const url = buildUrlWithQuery('https://api.example.com/products', {
      page: 1,
      size: 20,
    });

    expect(url).toContain('page=1');
    expect(url).toContain('size=20');
  });

  it('should skip undefined values', () => {
    const url = buildUrlWithQuery('https://api.example.com/products', {
      page: 1,
      search: undefined,
    });

    expect(url).toContain('page=1');
    expect(url).not.toContain('search');
  });

  it('should handle boolean values', () => {
    const url = buildUrlWithQuery('https://api.example.com/products', {
      active: true,
    });

    expect(url).toContain('active=true');
  });
});

// =============================================================================
// SECTION 10: API Domain Lists Tests
// =============================================================================

describe('SHOP_API_DOMAINS', () => {
  it('should have 12 domains', () => {
    expect(SHOP_API_DOMAINS.length).toBe(12);
  });

  it('should include auth domain', () => {
    expect(SHOP_API_DOMAINS).toContain('auth');
  });

  it('should include products domain', () => {
    expect(SHOP_API_DOMAINS).toContain('products');
  });

  it('should include cart domain', () => {
    expect(SHOP_API_DOMAINS).toContain('cart');
  });

  it('should include orders domain', () => {
    expect(SHOP_API_DOMAINS).toContain('orders');
  });
});

describe('ADMIN_API_DOMAINS', () => {
  it('should have 25 domains', () => {
    expect(ADMIN_API_DOMAINS.length).toBe(25);
  });

  it('should include products domain', () => {
    expect(ADMIN_API_DOMAINS).toContain('products');
  });

  it('should include members domain', () => {
    expect(ADMIN_API_DOMAINS).toContain('members');
  });

  it('should include delivery-templates domain', () => {
    expect(ADMIN_API_DOMAINS).toContain('delivery-templates');
  });

  it('should include statistics domain', () => {
    expect(ADMIN_API_DOMAINS).toContain('statistics');
  });
});

describe('SERVER_API_DOMAINS', () => {
  it('should have 12 domains', () => {
    expect(SERVER_API_DOMAINS.length).toBe(12);
  });

  it('should include webhooks domain', () => {
    expect(SERVER_API_DOMAINS).toContain('webhooks');
  });

  it('should include sync domain', () => {
    expect(SERVER_API_DOMAINS).toContain('sync');
  });
});

describe('INTERNAL_API_DOMAINS', () => {
  it('should have 31 domains', () => {
    expect(INTERNAL_API_DOMAINS.length).toBe(31);
  });

  it('should include cache domain', () => {
    expect(INTERNAL_API_DOMAINS).toContain('cache');
  });

  it('should include jobs domain', () => {
    expect(INTERNAL_API_DOMAINS).toContain('jobs');
  });
});

// =============================================================================
// SECTION 11: Environment Detection Tests
// =============================================================================

describe('detectEnvironment', () => {
  it('should detect production for api.shopby.co.kr', () => {
    expect(detectEnvironment('api.shopby.co.kr')).toBe('production');
  });

  it('should detect sandbox for sandbox-api.shopby.co.kr', () => {
    expect(detectEnvironment('sandbox-api.shopby.co.kr')).toBe('sandbox');
  });

  it('should detect sandbox for staging hostnames', () => {
    expect(detectEnvironment('staging.example.com')).toBe('sandbox');
  });

  it('should detect sandbox for test hostnames', () => {
    expect(detectEnvironment('test.example.com')).toBe('sandbox');
  });

  it('should detect production for localhost', () => {
    expect(detectEnvironment('localhost')).toBe('production');
  });
});

describe('isSandboxEnvironment', () => {
  it('should return true for sandbox URL', () => {
    expect(isSandboxEnvironment({
      baseUrl: 'https://sandbox-api.shopby.co.kr/shop/v1',
    })).toBe(true);
  });

  it('should return true for staging URL', () => {
    expect(isSandboxEnvironment({
      baseUrl: 'https://staging-api.shopby.co.kr/shop/v1',
    })).toBe(true);
  });

  it('should return false for production URL', () => {
    expect(isSandboxEnvironment({
      baseUrl: 'https://api.shopby.co.kr/shop/v1',
    })).toBe(false);
  });
});
