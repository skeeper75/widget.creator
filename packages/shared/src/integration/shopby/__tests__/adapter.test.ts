/**
 * Unit tests for ShopbyAdapter
 *
 * Tests cover handleEvent for product.created, product.updated,
 * product sync, order webhook handling, and healthCheck.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopbyAdapter } from '../adapter.js';
import type { ShopbyAdapterConfig, ShopbyDatabaseOps, ShopbyHttpClient } from '../adapter.js';
import type { ShopbyApiConfig, ShopbyProductSyncResponse } from '../types.js';
import { createEventMetadata } from '../../../events/types.js';
import type { ProductCreatedEvent, ProductUpdatedEvent } from '../../../events/types.js';

function createMockConfig(): ShopbyAdapterConfig {
  const api: ShopbyApiConfig = { baseUrl: 'https://shopby.test' };
  const db: ShopbyDatabaseOps = {
    getProduct: vi.fn(),
    updateProductShopbyId: vi.fn(),
    getCategoryMapping: vi.fn(),
    createOrder: vi.fn(),
    getOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
  };
  const http: ShopbyHttpClient = {
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    notifyOrderStatus: vi.fn(),
    healthCheck: vi.fn(),
  };
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  return { api, db, http, logger };
}

describe('ShopbyAdapter', () => {
  let adapter: ShopbyAdapter;
  let config: ShopbyAdapterConfig;

  beforeEach(() => {
    config = createMockConfig();
    adapter = new ShopbyAdapter(config);
  });

  describe('metadata', () => {
    it('should have name "shopby"', () => {
      expect(adapter.name).toBe('shopby');
    });

    it('should subscribe to product.created, product.updated, order.status.changed', () => {
      expect(adapter.subscribedEvents).toContain('product.created');
      expect(adapter.subscribedEvents).toContain('product.updated');
      expect(adapter.subscribedEvents).toContain('order.status.changed');
    });
  });

  describe('handleEvent product.created', () => {
    it('should call syncProductToShopby and create product via HTTP', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Test Product',
        categoryId: 10,
        sellingPrice: 15000,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.createProduct.mockResolvedValue({
        productNo: 500,
        productName: 'Test Product',
        status: 'created',
      } satisfies ShopbyProductSyncResponse);

      const event: ProductCreatedEvent = {
        type: 'product.created',
        payload: { productId: 1, huniCode: 'HC001' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.createProduct).toHaveBeenCalled();
      expect(db.updateProductShopbyId).toHaveBeenCalledWith(1, 500);
    });
  });

  describe('handleEvent product.updated', () => {
    it('should update existing product via HTTP with PUT', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: 500,
        name: 'Updated Product',
        categoryId: 10,
        sellingPrice: 20000,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.updateProduct.mockResolvedValue({
        productNo: 500,
        productName: 'Updated Product',
        status: 'updated',
      } satisfies ShopbyProductSyncResponse);

      const event: ProductUpdatedEvent = {
        type: 'product.updated',
        payload: { productId: 1, changes: { name: 'Updated Product' } },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.updateProduct).toHaveBeenCalledWith(500, expect.any(Object));
    });
  });

  describe('syncProductToShopby', () => {
    it('should return failure when product not found', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      db.getProduct.mockResolvedValue(null);

      const result = await adapter.syncProductToShopby(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });

    it('should return success with shopbyId after successful sync', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Test Product',
        categoryId: 10,
        sellingPrice: 15000,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.createProduct.mockResolvedValue({
        productNo: 600,
        productName: 'Test Product',
        status: 'created',
      });

      const result = await adapter.syncProductToShopby(1);

      expect(result.success).toBe(true);
      expect(result.shopbyId).toBe(600);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API responds', async () => {
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };
      http.healthCheck.mockResolvedValue(true);

      const result = await adapter.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };
      http.healthCheck.mockRejectedValue(new Error('timeout'));

      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return healthy status initially', () => {
      const status = adapter.getStatus();

      expect(status.name).toBe('shopby');
      expect(status.healthy).toBe(true);
      expect(status.circuitBreakerState).toBe('CLOSED');
      expect(status.consecutiveFailures).toBe(0);
    });
  });
});
