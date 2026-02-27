/**
 * Shopby Product Loader Tests
 * @see SPEC-SHOPBY-003 Section 4.3 steps 4-6
 *
 * Tests loading product data from Shopby API and extracting widgetCreator config.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadShopbyProduct,
  extractWidgetConfig,
  validateWidgetConfig,
  clearProductCache,
  getCachedProduct,
} from '@/shopby/product-loader';
import type {
  ShopbyProductData,
  ShopbyWidgetError,
} from '@/shopby/types';
import { ShopbyWidgetErrorCode } from '@/shopby/types';

describe('shopby/product-loader', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
    clearProductCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearProductCache();
  });

  describe('loadShopbyProduct()', () => {
    it('fetches product data from Shopby API with correct URL', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
        productImageUrls: ['https://example.com/image.jpg'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await loadShopbyProduct(12345);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.shopby.co.kr/shop/v1/products/12345',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );
    });

    it('uses custom API base URL when provided', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await loadShopbyProduct(12345, 'https://custom.api.com/v1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/products/12345',
        expect.any(Object)
      );
    });

    it('returns parsed product data on success', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Business Card',
        salePrice: 10000,
        productImageUrls: ['https://example.com/image.jpg'],
        extraJson: null,
        options: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loadShopbyProduct(12345);

      expect(result).toEqual({
        productNo: 12345,
        productName: 'Business Card',
        salePrice: 10000,
        imageUrls: ['https://example.com/image.jpg'],
        extraJson: null,
        options: [],
      });
    });

    it('handles nested baseInfo structure', async () => {
      const mockResponse = {
        baseInfo: {
          productName: 'Product from baseInfo',
          salePrice: 25000,
          imageUrls: ['https://example.com/base.jpg'],
        },
        options: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loadShopbyProduct(12345);

      expect(result.productName).toBe('Product from baseInfo');
      expect(result.salePrice).toBe(25000);
      expect(result.imageUrls).toEqual(['https://example.com/base.jpg']);
    });

    it('handles nested price structure', async () => {
      const mockResponse = {
        productName: 'Test Product',
        price: {
          salePrice: 15000,
          listPrice: 20000,
        },
        productImageUrls: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loadShopbyProduct(12345);

      expect(result.salePrice).toBe(15000);
    });

    it('handles imageUrls array with url objects', async () => {
      const mockResponse = {
        productName: 'Test Product',
        salePrice: 10000,
        imageUrls: [
          { url: 'https://example.com/img1.jpg' },
          { url: 'https://example.com/img2.jpg' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loadShopbyProduct(12345);

      expect(result.imageUrls).toEqual([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ]);
    });

    it('throws on 404 (product not found)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(loadShopbyProduct(99999)).rejects.toMatchObject({
        code: ShopbyWidgetErrorCode.PRODUCT_NOT_FOUND,
        message: expect.stringContaining('not found'),
      });
    });

    it('throws on 500 (server error)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(loadShopbyProduct(12345)).rejects.toMatchObject({
        code: ShopbyWidgetErrorCode.API_ERROR,
      });
    });

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(loadShopbyProduct(12345)).rejects.toMatchObject({
        code: ShopbyWidgetErrorCode.NETWORK_ERROR,
        message: expect.stringContaining('Failed to fetch'),
      });
    });

    it('includes productNo in error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      try {
        await loadShopbyProduct(54321);
        expect.fail('Should have thrown');
      } catch (error) {
        const widgetError = error as ShopbyWidgetError;
        expect(widgetError.message).toContain('54321');
      }
    });
  });

  describe('cache behavior', () => {
    it('caches successful response', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Cached Product',
        salePrice: 10000,
        productImageUrls: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result1 = await loadShopbyProduct(12345);
      const result2 = await loadShopbyProduct(12345);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('returns cached data on subsequent calls with same productNo', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await loadShopbyProduct(12345);
      const cached = getCachedProduct(12345);

      expect(cached).toBeDefined();
      expect(cached?.productName).toBe('Test Product');
    });

    it('does not cache error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(loadShopbyProduct(99999)).rejects.toBeDefined();
      expect(getCachedProduct(99999)).toBeUndefined();
    });

    it('fetches fresh data for different productNo', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: (productNo: number) => Promise.resolve({
          productNo,
          productName: `Product ${productNo}`,
          salePrice: 10000,
        }),
      });

      await loadShopbyProduct(12345);
      await loadShopbyProduct(67890);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clearProductCache clears all cached data', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await loadShopbyProduct(12345);
      clearProductCache();

      expect(getCachedProduct(12345)).toBeUndefined();
    });

    it('clearProductCache clears specific product only', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ salePrice: 10000 }),
      });

      await loadShopbyProduct(12345);
      await loadShopbyProduct(67890);
      clearProductCache(12345);

      expect(getCachedProduct(12345)).toBeUndefined();
      expect(getCachedProduct(67890)).toBeDefined();
    });
  });

  describe('extractWidgetConfig()', () => {
    it('extracts widgetCreator config from extraJson', () => {
      const extraJson = {
        widgetCreator: {
          version: '1.0.0',
          huniProductId: 100,
          huniCode: 'BC001',
          productType: 'BUSINESS_CARD',
          pricingModel: 'QUANTITY_TIER',
          orderMethod: 'upload',
          editorEnabled: false,
          widgetConfig: { theme: 'light' },
          features: ['foil', 'coating'],
          mesMapping: { code: 'BC001' },
        },
      };

      const result = extractWidgetConfig(extraJson);

      expect(result).not.toBeNull();
      expect(result?.huniProductId).toBe(100);
      expect(result?.huniCode).toBe('BC001');
    });

    it('returns null when extraJson is null', () => {
      const result = extractWidgetConfig(null);
      expect(result).toBeNull();
    });

    it('returns null when extraJson has no widgetCreator key', () => {
      const extraJson = {
        otherKey: 'value',
      };

      const result = extractWidgetConfig(extraJson);
      expect(result).toBeNull();
    });

    it('returns null when widgetCreator is invalid', () => {
      const extraJson = {
        widgetCreator: {
          // Missing required fields
          version: '1.0.0',
        },
      };

      const result = extractWidgetConfig(extraJson);
      expect(result).toBeNull();
    });
  });

  describe('validateWidgetConfig()', () => {
    const createValidConfig = () => ({
      version: '1.0.0',
      huniProductId: 100,
      huniCode: 'BC001',
      productType: 'BUSINESS_CARD',
      pricingModel: 'QUANTITY_TIER',
      orderMethod: 'upload' as const,
      editorEnabled: false,
      widgetConfig: { theme: 'light' },
      features: ['foil'],
      mesMapping: { code: 'BC001' },
    });

    it('validates correct config', () => {
      const config = createValidConfig();
      const result = validateWidgetConfig(config);
      expect(result).not.toBeNull();
      expect(result?.huniProductId).toBe(100);
    });

    it('rejects config with missing version', () => {
      const config = { ...createValidConfig(), version: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with wrong version type', () => {
      const config = { ...createValidConfig(), version: 123 };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with missing huniProductId', () => {
      const config = { ...createValidConfig(), huniProductId: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with wrong huniProductId type', () => {
      const config = { ...createValidConfig(), huniProductId: 'not-a-number' };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with missing huniCode', () => {
      const config = { ...createValidConfig(), huniCode: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with missing productType', () => {
      const config = { ...createValidConfig(), productType: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with missing pricingModel', () => {
      const config = { ...createValidConfig(), pricingModel: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with invalid orderMethod', () => {
      const config = { ...createValidConfig(), orderMethod: 'invalid' };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('accepts editor orderMethod', () => {
      const config = { ...createValidConfig(), orderMethod: 'editor' as const };
      const result = validateWidgetConfig(config);
      expect(result).not.toBeNull();
    });

    it('rejects config with missing editorEnabled', () => {
      const config = { ...createValidConfig(), editorEnabled: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with wrong editorEnabled type', () => {
      const config = { ...createValidConfig(), editorEnabled: 'yes' };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with missing widgetConfig', () => {
      const config = { ...createValidConfig(), widgetConfig: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with missing features array', () => {
      const config = { ...createValidConfig(), features: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with non-array features', () => {
      const config = { ...createValidConfig(), features: 'not-an-array' };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects config with missing mesMapping', () => {
      const config = { ...createValidConfig(), mesMapping: undefined };
      const result = validateWidgetConfig(config);
      expect(result).toBeNull();
    });

    it('rejects null config', () => {
      const result = validateWidgetConfig(null);
      expect(result).toBeNull();
    });

    it('rejects non-object config', () => {
      const result = validateWidgetConfig('invalid');
      expect(result).toBeNull();
    });
  });

  describe('response validation', () => {
    it('handles empty options array', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
        options: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loadShopbyProduct(12345);

      expect(result.options).toEqual([]);
    });

    it('handles null imageUrl gracefully', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
        productImageUrls: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loadShopbyProduct(12345);

      expect(result.imageUrls).toEqual([]);
    });

    it('handles missing image fields', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
        // No image fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await loadShopbyProduct(12345);

      expect(result.imageUrls).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles very large productNo', async () => {
      const largeNo = 999999999999;
      const mockResponse = { salePrice: 10000 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await loadShopbyProduct(largeNo);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(largeNo.toString()),
        expect.any(Object)
      );
    });

    it('handles concurrent requests for same product', async () => {
      const mockResponse = {
        productNo: 12345,
        productName: 'Test Product',
        salePrice: 10000,
      };

      // First call resolves, second uses cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Make first call to populate cache
      const result1 = await loadShopbyProduct(12345);

      // Second concurrent call should use cache
      const result2 = await loadShopbyProduct(12345);

      expect(result1.productNo).toBe(12345);
      expect(result2.productNo).toBe(12345);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one fetch due to caching
    });
  });
});
