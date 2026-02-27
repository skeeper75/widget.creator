/**
 * Shopby Integration Tests
 * @see SPEC-SHOPBY-003 Acceptance Criteria
 *
 * Tests complete integration scenarios for Aurora Skin embedding.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopbyAuthConnector } from '@/shopby/auth-connector';
import { EventEmitter, connectCallbacks } from '@/shopby/event-emitter';
import { PriceSyncManager } from '@/shopby/price-sync';
import { ShopbyBridge } from '@/shopby/shopby-bridge';
import {
  loadShopbyProduct,
  extractWidgetConfig,
  clearProductCache,
} from '@/shopby/product-loader';
import { validateInitConfig, validatePayload } from '@/shopby/types';
import type {
  ShopbyWidgetInitConfig,
  WidgetToShopbyPayload,
  PriceSyncResult,
} from '@/shopby/types';

// Helper to create a valid JWT token
function createMockToken(exp?: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      exp: exp ?? Math.floor(Date.now() / 1000) + 3600,
      sub: 'user-123',
    })
  );
  const signature = btoa('signature');
  return `${header}.${payload}.${signature}`;
}

describe('shopby/integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    clearProductCache();

    // Create test container
    container = document.createElement('div');
    container.id = 'widget-root';
    container.setAttribute('data-wc-product', '12345');
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearProductCache();
    document.body.innerHTML = '';
  });

  describe('AC-001: Aurora Skin Widget Embedding', () => {
    it('validates widget config for Aurora Skin scenario', () => {
      const config: ShopbyWidgetInitConfig = {
        container: '#widget-root',
        shopbyProductNo: 12345,
        theme: {
          primaryColor: '#5538B6',
          borderRadius: '4px',
        },
        locale: 'ko',
      };

      const result = validateInitConfig(config);

      expect(result.success).toBe(true);
    });

    it('auto-detects container with data-wc-product attribute', () => {
      const found = document.querySelector('[data-wc-product]');
      const productNo = found?.getAttribute('data-wc-product');

      expect(found).toBe(container);
      expect(productNo).toBe('12345');
    });

    it('creates Shadow DOM for style isolation', () => {
      const shadowRoot = container.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ':host { display: block; }';
      shadowRoot.appendChild(style);
      const mountPoint = document.createElement('div');
      mountPoint.id = 'widget-mount';
      shadowRoot.appendChild(mountPoint);

      expect(shadowRoot.mode).toBe('open');
      expect(shadowRoot.querySelector('style')).toBeTruthy();
      expect(shadowRoot.getElementById('widget-mount')).toBeTruthy();
    });

    it('handles non-printing product page (no widgetCreator config)', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Regular Product',
        salePrice: 10000,
        extraJson: null, // No widget config
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const product = await loadShopbyProduct(12345);
      const widgetConfig = extractWidgetConfig(product.extraJson);

      expect(widgetConfig).toBeNull();
    });

    it('handles API server unavailability with error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(loadShopbyProduct(12345)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });
  });

  describe('AC-002: Cart/Order Integration', () => {
    let auth: ShopbyAuthConnector;
    let events: EventEmitter;
    let bridge: ShopbyBridge;

    beforeEach(() => {
      auth = new ShopbyAuthConnector(createMockToken());
      events = new EventEmitter();
      bridge = new ShopbyBridge(auth, events);
    });

    afterEach(() => {
      events.removeAllListeners();
    });

    it('adds to cart with correct payload structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      const payload: WidgetToShopbyPayload = {
        productNo: 12345,
        optionNo: 1,
        orderCnt: 200,
        optionInputs: {
          designFileUrl: 'https://example.com/business-card.pdf',
          printSpec: JSON.stringify({
            size: '90x50',
            paper: 'Snow White 120g',
            printType: 'Double-sided',
          }),
        },
        widgetPrice: {
          basePrice: 50000,
          optionPrice: 10000,
          postProcessPrice: 5000,
          deliveryPrice: 3000,
          totalPrice: 68000,
        },
      };

      const result = await bridge.addToCart(payload);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.items[0].productNo).toBe(12345);
      expect(body.items[0].orderCnt).toBe(200);
    });

    it('emits addToCart event on success', async () => {
      const addToCartListener = vi.fn();
      events.on('addToCart', addToCartListener);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart({
        productNo: 1,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: { designFileUrl: '', printSpec: '' },
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });

      expect(addToCartListener).toHaveBeenCalled();
    });

    it('handles buy now (order sheet creation)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      const payload: WidgetToShopbyPayload = {
        productNo: 12345,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: {
          designFileUrl: 'https://example.com/design.pdf',
          printSpec: '{}',
        },
        widgetPrice: {
          basePrice: 50000,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 50000,
        },
      };

      const result = await bridge.buyNow(payload);

      expect(result.success).toBe(true);
      expect(result.orderSheetNo).toBe('OS-12345');
      expect(result.redirectUrl).toContain('OS-12345');
    });

    it('blocks cart operation for guest users', async () => {
      const guestAuth = new ShopbyAuthConnector();
      const guestBridge = new ShopbyBridge(guestAuth, events);

      const result = await guestBridge.addToCart({
        productNo: 1,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: { designFileUrl: '', printSpec: '' },
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });

  describe('AC-003: Shopby Session/Auth Integration', () => {
    it('reflects member grade pricing', () => {
      const auth = new ShopbyAuthConnector(createMockToken());
      auth.setMemberGrade('GOLD');

      expect(auth.getMemberGrade()).toBe('GOLD');
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('attempts token refresh when expired', async () => {
      const oldToken = createMockToken(Math.floor(Date.now() / 1000) - 3600);
      const newToken = createMockToken(Math.floor(Date.now() / 1000) + 3600);
      const auth = new ShopbyAuthConnector(oldToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken, expiresIn: 3600 }),
      });

      const result = await auth.refreshToken();

      expect(result).toBe(true);
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('shows login prompt on auth failure', async () => {
      const events = new EventEmitter();
      const auth = new ShopbyAuthConnector();
      const bridge = new ShopbyBridge(auth, events);

      const errorListener = vi.fn();
      events.on('error', errorListener);

      await bridge.addToCart({
        productNo: 1,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: { designFileUrl: '', printSpec: '' },
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_REQUIRED',
        })
      );

      events.removeAllListeners();
    });
  });

  describe('AC-004: Price Synchronization', () => {
    let priceSync: PriceSyncManager;

    beforeEach(() => {
      priceSync = new PriceSyncManager(0.1); // 10% tolerance
    });

    it('calculates real-time price correctly', () => {
      const breakdown = priceSync.calculatePriceBreakdown({
        basePrice: 50000,
        optionPrice: 10000,
        postProcessPrice: 5000,
        deliveryPrice: 3000,
      });

      expect(breakdown.totalPrice).toBe(68000);
      expect(breakdown.basePrice).toBe(50000);
      expect(breakdown.optionPrice).toBe(10000);
    });

    it('reflects quantity-based price change', () => {
      // Simulate price tier change
      const lowQtyPrice = priceSync.calculatePriceBreakdown({
        basePrice: 100000, // 100 qty
        deliveryPrice: 3000,
      });

      const highQtyPrice = priceSync.calculatePriceBreakdown({
        basePrice: 70000, // 500 qty - lower unit price
        deliveryPrice: 3000,
      });

      expect(lowQtyPrice.totalPrice).toBeGreaterThan(highQtyPrice.totalPrice);
    });

    it('detects 10%+ price mismatch', () => {
      const result = priceSync.comparePrices(10000, 12000);

      expect(result.isWithinTolerance).toBe(false);
      expect(result.discrepancy).toBe(2000);
    });

    it('emits priceChange event on comparison', () => {
      const onPriceChange = vi.fn();
      const sync = new PriceSyncManager(0.1, onPriceChange);

      sync.comparePrices(10000, 10500);

      expect(onPriceChange).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetPrice: 10000,
          shopbyPrice: 10500,
        })
      );
    });

    it('serializes price for optionInputs', () => {
      const breakdown = priceSync.calculatePriceBreakdown({
        basePrice: 50000,
        optionPrice: 10000,
        postProcessPrice: 5000,
        deliveryPrice: 3000,
      });

      const serialized = priceSync.serializePriceForOptionInputs(breakdown);

      expect(typeof serialized).toBe('string');
      const parsed = JSON.parse(serialized);
      expect(parsed.totalPrice).toBe(68000);
    });
  });

  describe('AC-005: Event System Integration', () => {
    let events: EventEmitter;

    beforeEach(() => {
      events = new EventEmitter();
    });

    afterEach(() => {
      events.removeAllListeners();
    });

    it('emits widgetCreator: prefixed CustomEvents', () => {
      const documentListener = vi.fn();
      document.addEventListener('widgetCreator:priceChange', documentListener);

      events.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      expect(documentListener).toHaveBeenCalled();

      document.removeEventListener('widgetCreator:priceChange', documentListener);
    });

    it('connects callbacks to events', () => {
      const onAddToCart = vi.fn();
      const onPriceChange = vi.fn();
      const callbacks = { onAddToCart, onPriceChange };

      const cleanup = connectCallbacks(events, callbacks);

      events.emit('addToCart', {
        productNo: 1,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: { designFileUrl: '', printSpec: '' },
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });

      expect(onAddToCart).toHaveBeenCalled();

      cleanup();
    });

    it('handles errors in listeners without crashing', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = vi.fn();

      events.on('priceChange', errorCallback);
      events.on('priceChange', successCallback);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() =>
        events.emit('priceChange', {
          widgetPrice: 10000,
          shopbyPrice: 10000,
          discrepancy: 0,
          isWithinTolerance: true,
          tolerance: 0.1,
        })
      ).not.toThrow();

      expect(successCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Payload Validation Integration', () => {
    it('validates complete cart payload', () => {
      const payload: WidgetToShopbyPayload = {
        productNo: 12345,
        optionNo: 1,
        orderCnt: 200,
        optionInputs: {
          designFileUrl: 'https://example.com/design.pdf',
          printSpec: JSON.stringify({ size: '90x50' }),
          specialRequest: 'Please rush',
          proofRequired: true,
        },
        widgetPrice: {
          basePrice: 50000,
          optionPrice: 10000,
          postProcessPrice: 5000,
          deliveryPrice: 3000,
          totalPrice: 68000,
        },
      };

      const result = validatePayload(payload);

      expect(result.success).toBe(true);
    });

    it('rejects invalid payload', () => {
      const invalidPayload = {
        productNo: 12345,
        // Missing required fields
      };

      const result = validatePayload(invalidPayload);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Product Loading Integration', () => {
    it('loads product with widgetCreator config', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Business Card',
        salePrice: 10000,
        productImageUrls: ['https://example.com/bc.jpg'],
        extraJson: {
          widgetCreator: {
            version: '1.0.0',
            huniProductId: 100,
            huniCode: 'BC001',
            productType: 'BUSINESS_CARD',
            pricingModel: 'QUANTITY_TIER',
            orderMethod: 'upload',
            editorEnabled: false,
            widgetConfig: {},
            features: [],
            mesMapping: {},
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const product = await loadShopbyProduct(12345);
      const widgetConfig = extractWidgetConfig(product.extraJson);

      expect(product.productNo).toBe(12345);
      expect(widgetConfig).not.toBeNull();
      expect(widgetConfig?.huniCode).toBe('BC001');
    });

    it('caches product data', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Cached Product',
        salePrice: 10000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await loadShopbyProduct(12345);
      await loadShopbyProduct(12345);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery Scenarios', () => {
    let auth: ShopbyAuthConnector;
    let events: EventEmitter;
    let bridge: ShopbyBridge;

    beforeEach(() => {
      auth = new ShopbyAuthConnector(createMockToken());
      events = new EventEmitter();
      bridge = new ShopbyBridge(auth, events);
    });

    afterEach(() => {
      events.removeAllListeners();
    });

    it('recovers from network error with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ cartNo: 999 }),
        });

      const result = await bridge.addToCart({
        productNo: 1,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: { designFileUrl: '', printSpec: '' },
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('emits error event on all retries exhausted', async () => {
      const errorListener = vi.fn();
      events.on('error', errorListener);

      mockFetch.mockRejectedValue(new TypeError('Network error'));

      await bridge.addToCart({
        productNo: 1,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: { designFileUrl: '', printSpec: '' },
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });

      expect(errorListener).toHaveBeenCalled();
    });

    it('handles 401 with auth refresh attempt', async () => {
      const newToken = createMockToken();
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: newToken }),
        });

      // First request fails with 401
      const result1 = await bridge.addToCart({
        productNo: 1,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: { designFileUrl: '', printSpec: '' },
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });

      expect(result1.success).toBe(false);

      // Token can be refreshed
      const refreshResult = await auth.refreshToken();
      expect(refreshResult).toBe(true);
    });
  });
});
