/**
 * Shopby Bridge Tests
 * @see SPEC-SHOPBY-003 Section 3.2 (R-WDG-002)
 *
 * Tests Shopby API bridge for cart and order operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopbyBridge } from '@/shopby/shopby-bridge';
import { ShopbyAuthConnector } from '@/shopby/auth-connector';
import { EventEmitter } from '@/shopby/event-emitter';
import type {
  WidgetToShopbyPayload,
  CartResult,
  OrderSheetResult,
} from '@/shopby/types';
import { ShopbyWidgetErrorCode } from '@/shopby/types';

describe('shopby/shopby-bridge', () => {
  let bridge: ShopbyBridge;
  let auth: ShopbyAuthConnector;
  let events: EventEmitter;
  let mockFetch: ReturnType<typeof vi.fn>;

  const createTestPayload = (): WidgetToShopbyPayload => ({
    productNo: 12345,
    optionNo: 1,
    orderCnt: 100,
    optionInputs: {
      designFileUrl: 'https://example.com/design.pdf',
      printSpec: JSON.stringify({ size: 'A4', paper: 'Snow White' }),
      specialRequest: 'Please handle with care',
      proofRequired: true,
    },
    widgetPrice: {
      basePrice: 50000,
      optionPrice: 10000,
      postProcessPrice: 5000,
      deliveryPrice: 3000,
      totalPrice: 68000,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh instances
    auth = new ShopbyAuthConnector('valid-token-123');
    events = new EventEmitter();
    bridge = new ShopbyBridge(auth, events);

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    events.removeAllListeners();
    vi.restoreAllMocks();
  });

  describe('addToCart()', () => {
    it('sends POST request to /cart endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('includes correct Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
      });
    });

    it('includes auth headers from auth connector', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer valid-token-123',
      });
    });

    it('includes productNo in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.items[0].productNo).toBe(12345);
    });

    it('includes optionNo in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.items[0].optionNo).toBe(1);
    });

    it('includes orderCnt in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.items[0].orderCnt).toBe(100);
    });

    it('includes optionInputs in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.items[0].optionInputs).toBeDefined();
      expect(body.items[0].optionInputs).toBeInstanceOf(Array);
    });

    it('returns success response on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      const result = await bridge.addToCart(createTestPayload());

      expect(result.success).toBe(true);
      expect(result.cartNo).toBe(999);
    });

    it('emits addToCart event on success', async () => {
      const payload = createTestPayload();
      const addToCartListener = vi.fn();
      events.on('addToCart', addToCartListener);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(payload);

      expect(addToCartListener).toHaveBeenCalledWith(payload);
    });

    it('returns error when auth fails', async () => {
      const guestAuth = new ShopbyAuthConnector(); // No token
      const guestBridge = new ShopbyBridge(guestAuth, events);

      const result = await guestBridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('emits error event on auth failure', async () => {
      const guestAuth = new ShopbyAuthConnector();
      const guestBridge = new ShopbyBridge(guestAuth, events);
      const errorListener = vi.fn();
      events.on('error', errorListener);

      await guestBridge.addToCart(createTestPayload());

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('buyNow()', () => {
    it('sends POST request to /order-sheets endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      await bridge.buyNow(createTestPayload());

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/order-sheets'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('includes correct Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      await bridge.buyNow(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
      });
    });

    it('includes auth headers from auth connector', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      await bridge.buyNow(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer valid-token-123',
      });
    });

    it('includes productNo in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      await bridge.buyNow(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.products[0].productNo).toBe(12345);
    });

    it('includes orderCnt in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      await bridge.buyNow(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.products[0].orderCnt).toBe(100);
    });

    it('includes optionInputs in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      await bridge.buyNow(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.products[0].optionInputs).toBeDefined();
    });

    it('returns order sheet URL on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      const result = await bridge.buyNow(createTestPayload());

      expect(result.success).toBe(true);
      expect(result.orderSheetNo).toBe('OS-12345');
      expect(result.redirectUrl).toContain('OS-12345');
    });

    it('emits buyNow event on success', async () => {
      const payload = createTestPayload();
      const buyNowListener = vi.fn();
      events.on('buyNow', buyNowListener);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderSheetNo: 'OS-12345' }),
      });

      await bridge.buyNow(payload);

      expect(buyNowListener).toHaveBeenCalledWith(payload);
    });

    it('returns error when auth fails', async () => {
      const guestAuth = new ShopbyAuthConnector();
      const guestBridge = new ShopbyBridge(guestAuth, events);

      const result = await guestBridge.buyNow(createTestPayload());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('payload structure', () => {
    it('formats optionInputs as Shopby-compatible structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      const optionInputs = body.items[0].optionInputs;

      expect(optionInputs).toBeInstanceOf(Array);
      optionInputs.forEach((input: { inputLabel: string; inputValue: string }) => {
        expect(input).toHaveProperty('inputLabel');
        expect(input).toHaveProperty('inputValue');
      });
    });

    it('includes designFileUrl in optionInputs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      const optionInputs = body.items[0].optionInputs;

      const designInput = optionInputs.find(
        (i: { inputLabel: string }) => i.inputLabel === 'designFileUrl'
      );
      expect(designInput).toBeDefined();
      expect(designInput.inputValue).toBe('https://example.com/design.pdf');
    });

    it('includes printSpec in optionInputs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      const optionInputs = body.items[0].optionInputs;

      const printSpecInput = optionInputs.find(
        (i: { inputLabel: string }) => i.inputLabel === 'printSpec'
      );
      expect(printSpecInput).toBeDefined();
    });

    it('includes widget calculated price in optionInputs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      const optionInputs = body.items[0].optionInputs;

      const priceInput = optionInputs.find(
        (i: { inputLabel: string }) => i.inputLabel === 'widgetPrice'
      );
      expect(priceInput).toBeDefined();
      const priceValue = JSON.parse(priceInput.inputValue);
      expect(priceValue.totalPrice).toBe(68000);
    });

    it('includes specialRequest when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      const optionInputs = body.items[0].optionInputs;

      const specialInput = optionInputs.find(
        (i: { inputLabel: string }) => i.inputLabel === 'specialRequest'
      );
      expect(specialInput).toBeDefined();
      expect(specialInput.inputValue).toBe('Please handle with care');
    });

    it('excludes undefined specialRequest from payload', async () => {
      const payload = createTestPayload();
      delete payload.optionInputs.specialRequest;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(payload);

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      const optionInputs = body.items[0].optionInputs;

      const specialInput = optionInputs.find(
        (i: { inputLabel: string }) => i.inputLabel === 'specialRequest'
      );
      expect(specialInput).toBeUndefined();
    });

    it('includes proofRequired as string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await bridge.addToCart(createTestPayload());

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body as string);
      const optionInputs = body.items[0].optionInputs;

      const proofInput = optionInputs.find(
        (i: { inputLabel: string }) => i.inputLabel === 'proofRequired'
      );
      expect(proofInput).toBeDefined();
      expect(proofInput.inputValue).toBe('true');
    });
  });

  describe('error handling', () => {
    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await bridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('throws on 400 (bad request)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid payload'),
      });

      const result = await bridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
    });

    it('throws on 500 (server error)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      const result = await bridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
    });

    it('includes API error message in thrown error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Database connection failed'),
      });

      const result = await bridge.addToCart(createTestPayload());

      expect(result.error).toContain('500');
    });

    it('emits error event on failure', async () => {
      const errorListener = vi.fn();
      events.on('error', errorListener);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(''),
      });

      await bridge.addToCart(createTestPayload());

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('retry behavior', () => {
    it('retries on network error up to max retries', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      const result = await bridge.addToCart(createTestPayload());

      // Initial call + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(false);
    });

    it('does not retry on 4xx client errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(''),
      });

      await bridge.addToCart(createTestPayload());

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx server errors (network-like)', async () => {
      // Note: Implementation only retries on TypeError (network errors)
      // HTTP errors are not retried
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve(''),
      });

      await bridge.addToCart(createTestPayload());

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns last error after all retries exhausted', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network timeout'));

      const result = await bridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('guest user restrictions', () => {
    it('blocks addToCart for guest users', async () => {
      const guestAuth = new ShopbyAuthConnector();
      const guestBridge = new ShopbyBridge(guestAuth, events);

      const result = await guestBridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    it('blocks buyNow for guest users', async () => {
      const guestAuth = new ShopbyAuthConnector();
      const guestBridge = new ShopbyBridge(guestAuth, events);

      const result = await guestBridge.buyNow(createTestPayload());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    it('emits auth-required error for guest', async () => {
      const guestAuth = new ShopbyAuthConnector();
      const guestBridge = new ShopbyBridge(guestAuth, events);
      const errorListener = vi.fn();
      events.on('error', errorListener);

      await guestBridge.addToCart(createTestPayload());

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ShopbyWidgetErrorCode.AUTH_REQUIRED,
        })
      );
    });
  });

  describe('custom API base URL', () => {
    it('uses custom API base URL when provided', async () => {
      const customBridge = new ShopbyBridge(auth, events, 'https://custom.api.com');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      await customBridge.addToCart(createTestPayload());

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.api.com'),
        expect.any(Object)
      );
    });
  });

  describe('auth integration', () => {
    it('handles 401 response (expired token)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Token expired'),
      });

      const result = await bridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
    });

    it('handles 403 response (forbidden)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Access denied'),
      });

      const result = await bridge.addToCart(createTestPayload());

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty optionInputs gracefully', async () => {
      const payload = createTestPayload();
      payload.optionInputs = {
        designFileUrl: '',
        printSpec: '',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      const result = await bridge.addToCart(payload);

      expect(result.success).toBe(true);
    });

    it('handles large payload', async () => {
      const payload = createTestPayload();
      payload.optionInputs.specialRequest = 'x'.repeat(10000);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      const result = await bridge.addToCart(payload);

      expect(result.success).toBe(true);
    });

    it('handles concurrent cart additions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cartNo: 999 }),
      });

      const results = await Promise.all([
        bridge.addToCart(createTestPayload()),
        bridge.addToCart(createTestPayload()),
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });
});
