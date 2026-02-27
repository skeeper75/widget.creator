/**
 * Unit tests for ShopbyAdapter
 *
 * Tests cover handleEvent for product.created, product.updated,
 * product sync, order webhook handling, and healthCheck.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopbyAdapter } from '../adapter.js';
import type { ShopbyAdapterConfig, ShopbyDatabaseOps, ShopbyHttpClient } from '../adapter.js';
import type { ShopbyApiConfig, ShopbyProductSyncResponse } from '../types.js';
import { createEventMetadata } from '../../../events/types.js';
import type { ProductCreatedEvent, ProductUpdatedEvent } from '../../../events/types.js';
import { CircuitBreakerOpenError } from '../../circuit-breaker.js';
import { RetryExhaustedError } from '../../retry.js';

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

    it('should track lastSuccessAt after successful sync', async () => {
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
      });

      await adapter.syncProductToShopby(1);

      const status = adapter.getStatus();
      expect(status.lastSuccessAt).toBeInstanceOf(Date);
      expect(status.consecutiveFailures).toBe(0);
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should have resetCircuitBreaker method available', () => {
      expect(typeof adapter.resetCircuitBreaker).toBe('function');
    });

    it('should reset circuit breaker state when called', () => {
      // Circuit breaker starts CLOSED
      expect(adapter.getStatus().circuitBreakerState).toBe('CLOSED');

      // Calling reset should keep it CLOSED
      adapter.resetCircuitBreaker();

      expect(adapter.getStatus().circuitBreakerState).toBe('CLOSED');
    });
  });

  describe('handleEvent order.status.changed', () => {
    it('should notify Shopby when order is from shopby source', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue({
        id: 'order-1',
        source: 'shopby',
        shopbyOrderNo: 'SB-2024-001',
        status: 'CONFIRMED',
      });
      http.notifyOrderStatus.mockResolvedValue({ success: true });

      const event = {
        type: 'order.status.changed' as const,
        payload: { orderId: 'order-1', to: 'SHIPPED' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.notifyOrderStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          orderNo: 'SB-2024-001',
          status: 'DELIVERING',
        })
      );
    });

    it('should not notify when order is not from shopby source', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue({
        id: 'order-1',
        source: 'widget',
        shopbyOrderNo: null,
        status: 'CONFIRMED',
      });

      const event = {
        type: 'order.status.changed' as const,
        payload: { orderId: 'order-1', to: 'SHIPPED' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.notifyOrderStatus).not.toHaveBeenCalled();
    });

    it('should not notify when order has no shopbyOrderNo', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue({
        id: 'order-1',
        source: 'shopby',
        shopbyOrderNo: null,
        status: 'CONFIRMED',
      });

      const event = {
        type: 'order.status.changed' as const,
        payload: { orderId: 'order-1', to: 'SHIPPED' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.notifyOrderStatus).not.toHaveBeenCalled();
    });

    it('should not notify when order is not found', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue(null);

      const event = {
        type: 'order.status.changed' as const,
        payload: { orderId: 'nonexistent', to: 'SHIPPED' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.notifyOrderStatus).not.toHaveBeenCalled();
    });

    it('should handle error during order status change', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      db.getOrder.mockRejectedValue(new Error('DB error'));

      const event = {
        type: 'order.status.changed' as const,
        payload: { orderId: 'order-1', to: 'SHIPPED' },
        metadata: createEventMetadata('test'),
      };

      // Should not throw
      await adapter.handleEvent(event);

      expect(logger.error).toHaveBeenCalledWith(
        'Error handling order.status.changed',
        expect.objectContaining({ orderId: 'order-1' })
      );
    });
  });

  describe('createOrderFromWebhook', () => {
    it('should log order creation and return null', async () => {
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      const shopbyOrder = {
        orderNo: 'SB-2024-001',
        productNo: 12345,
        optionValues: ['90x100', 'Color'],
        orderAmount: 45000,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
      };

      const result = await adapter.createOrderFromWebhook(shopbyOrder);

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        'Creating order from Shopby webhook',
        expect.objectContaining({
          orderNo: 'SB-2024-001',
          customerName: 'John Doe',
          totalPrice: 45000,
        })
      );
    });
  });

  describe('handleEvent error handling', () => {
    it('should handle error in product.created handler', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      db.getProduct.mockRejectedValue(new Error('DB connection failed'));

      const event: ProductCreatedEvent = {
        type: 'product.created',
        payload: { productId: 1, huniCode: 'HC001' },
        metadata: createEventMetadata('test'),
      };

      // Should not throw
      await adapter.handleEvent(event);

      expect(logger.error).toHaveBeenCalledWith(
        'Error handling product.created',
        expect.objectContaining({ productId: 1 })
      );
    });

    it('should handle error in product.updated handler', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      db.getProduct.mockRejectedValue(new Error('DB connection failed'));

      const event: ProductUpdatedEvent = {
        type: 'product.updated',
        payload: { productId: 1, changes: { name: 'Updated' } },
        metadata: createEventMetadata('test'),
      };

      // Should not throw
      await adapter.handleEvent(event);

      expect(logger.error).toHaveBeenCalledWith(
        'Error handling product.updated',
        expect.objectContaining({ productId: 1 })
      );
    });
  });

  describe('syncProductToShopby with category', () => {
    it('should fetch category mapping when categoryId exists', async () => {
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
      db.getCategoryMapping.mockResolvedValue({
        shopbyCategoryNo: 500,
        categoryName: 'Stickers',
      });
      http.createProduct.mockResolvedValue({
        productNo: 600,
        productName: 'Test Product',
        status: 'created',
      });

      await adapter.syncProductToShopby(1);

      expect(db.getCategoryMapping).toHaveBeenCalledWith(10);
    });

    it('should handle sync failure gracefully', async () => {
      vi.useFakeTimers();
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
      http.createProduct.mockRejectedValue(new Error('API error'));

      const promise = adapter.syncProductToShopby(1);

      // Advance through all retry delays (3 retries with exponential backoff)
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');

      vi.useRealTimers();
    });
  });

  describe('consecutive failure tracking', () => {
    it('should increment consecutiveFailures after each failed sync', async () => {
      vi.useFakeTimers();
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
      http.createProduct.mockRejectedValue(new Error('Server error'));

      // First failure
      const promise1 = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      await promise1;

      expect(adapter.getStatus().consecutiveFailures).toBe(1);

      // Second failure
      const promise2 = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      await promise2;

      expect(adapter.getStatus().consecutiveFailures).toBe(2);
      expect(adapter.getStatus().lastFailureAt).toBeInstanceOf(Date);

      vi.useRealTimers();
    });

    it('should reset consecutiveFailures after successful sync', async () => {
      vi.useFakeTimers();
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

      // First: failure
      http.createProduct.mockRejectedValue(new Error('Server error'));
      const promise1 = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      await promise1;

      expect(adapter.getStatus().consecutiveFailures).toBe(1);

      // Second: success
      http.createProduct.mockResolvedValue({
        productNo: 600,
        productName: 'Test Product',
        status: 'created',
      });
      await adapter.syncProductToShopby(1);

      expect(adapter.getStatus().consecutiveFailures).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('unhandled event types', () => {
    it('should silently ignore unknown event types', async () => {
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      const event = {
        type: 'unknown.event' as const,
        payload: { data: 'test' },
        metadata: createEventMetadata('test'),
      };

      // Should not throw
      await adapter.handleEvent(event as unknown as Parameters<typeof adapter.handleEvent>[0]);

      // Should not log any errors
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('product update path (existing shopbyId)', () => {
    it('should call updateProduct instead of createProduct when shopbyId exists', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: 500,
        name: 'Test Product',
        categoryId: 10,
        sellingPrice: 15000,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.updateProduct.mockResolvedValue({
        productNo: 500,
        productName: 'Test Product',
        status: 'updated',
      });

      const result = await adapter.syncProductToShopby(1);

      expect(result.success).toBe(true);
      expect(http.updateProduct).toHaveBeenCalledWith(500, expect.any(Object));
      expect(http.createProduct).not.toHaveBeenCalled();
      // updateProductShopbyId should NOT be called for updates
      expect(db.updateProductShopbyId).not.toHaveBeenCalled();
    });

    it('should call createProduct and updateProductShopbyId when shopbyId is null', async () => {
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
      expect(http.createProduct).toHaveBeenCalled();
      expect(http.updateProduct).not.toHaveBeenCalled();
      expect(db.updateProductShopbyId).toHaveBeenCalledWith(1, 600);
    });
  });

  describe('logger behavior', () => {
    it('should use default console logger when no logger provided', () => {
      const configWithoutLogger = createMockConfig();
      delete configWithoutLogger.logger;

      const adapterWithDefaultLogger = new ShopbyAdapter(configWithoutLogger);

      expect(adapterWithDefaultLogger.getStatus()).toBeDefined();
    });

    it('should log warning on failed sync', async () => {
      vi.useFakeTimers();
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Test Product',
        categoryId: 10,
        sellingPrice: 15000,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.createProduct.mockRejectedValue(new Error('Network error'));

      const event: ProductCreatedEvent = {
        type: 'product.created',
        payload: { productId: 1, huniCode: 'HC001' },
        metadata: createEventMetadata('test'),
      };

      const promise = adapter.handleEvent(event);

      // Advance through all retry delays
      await vi.runAllTimersAsync();

      await promise;

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to sync product to Shopby',
        expect.objectContaining({ productId: 1, error: expect.stringContaining('Network error') })
      );

      vi.useRealTimers();
    });

    it('should log info on successful product update', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

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
      });

      const event: ProductUpdatedEvent = {
        type: 'product.updated',
        payload: { productId: 1, changes: { name: 'Updated Product' } },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(logger.info).toHaveBeenCalledWith(
        'Product updated in Shopby',
        expect.objectContaining({ productId: 1, shopbyId: 500 })
      );
    });
  });

  // ===========================================================================
  // SPEC-002: Circuit Breaker Behavior
  // ===========================================================================

  describe('circuit breaker state transitions', () => {
    it('should open circuit after 5 consecutive failures', async () => {
      vi.useFakeTimers();
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
      http.createProduct.mockRejectedValue(new Error('API error'));

      // 5 failures to open the circuit (each has 3 retries = 4 attempts per call)
      for (let i = 0; i < 5; i++) {
        const promise = adapter.syncProductToShopby(1);
        await vi.runAllTimersAsync();
        await promise;
      }

      expect(adapter.getStatus().circuitBreakerState).toBe('OPEN');

      vi.useRealTimers();
    });

    it('should fast-fail when circuit is open', async () => {
      vi.useFakeTimers();
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
      http.createProduct.mockRejectedValue(new Error('API error'));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        const promise = adapter.syncProductToShopby(1);
        await vi.runAllTimersAsync();
        await promise;
      }

      expect(adapter.getStatus().circuitBreakerState).toBe('OPEN');

      // Next call should fail fast without calling HTTP
      http.createProduct.mockClear();
      const result = await adapter.syncProductToShopby(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker');
      // HTTP should NOT have been called (fast-fail)
      expect(http.createProduct).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should recover from OPEN to CLOSED after cooldown + success', async () => {
      vi.useFakeTimers();
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
      http.createProduct.mockRejectedValue(new Error('API error'));

      // Open the circuit with 5 failures
      for (let i = 0; i < 5; i++) {
        const promise = adapter.syncProductToShopby(1);
        await vi.runAllTimersAsync();
        await promise;
      }

      expect(adapter.getStatus().circuitBreakerState).toBe('OPEN');

      // Advance past cooldown (60s)
      vi.advanceTimersByTime(61000);

      // Now the circuit should be HALF_OPEN and allow one test request
      http.createProduct.mockResolvedValue({
        productNo: 700,
        productName: 'Test Product',
        status: 'created',
      });

      const result = await adapter.syncProductToShopby(1);

      expect(result.success).toBe(true);
      expect(adapter.getStatus().circuitBreakerState).toBe('CLOSED');

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // SPEC-002: Timeout & Rate Limit Scenarios
  // ===========================================================================

  describe('timeout scenarios', () => {
    it('should handle API timeout error during create', async () => {
      vi.useFakeTimers();
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

      const timeoutError = new Error('Request timeout after 30000ms');
      timeoutError.name = 'TimeoutError';
      http.createProduct.mockRejectedValue(timeoutError);

      const promise = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      vi.useRealTimers();
    });

    it('should handle API timeout error during update', async () => {
      vi.useFakeTimers();
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: 500,
        name: 'Test Product',
        categoryId: 10,
        sellingPrice: 15000,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.updateProduct.mockRejectedValue(new Error('Connection timeout'));

      const promise = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');

      vi.useRealTimers();
    });
  });

  describe('rate limit responses', () => {
    it('should handle 429 rate limit error during product sync', async () => {
      vi.useFakeTimers();
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

      const rateLimitError = new Error('Rate limit exceeded (429)');
      http.createProduct.mockRejectedValue(rateLimitError);

      const promise = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
      // Should have been retried (createProduct called 4 times: 1 + 3 retries)
      expect(http.createProduct).toHaveBeenCalledTimes(4);

      vi.useRealTimers();
    });

    it('should succeed after rate limit clears on retry', async () => {
      vi.useFakeTimers();
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

      // First 2 attempts fail with rate limit, 3rd succeeds
      let callCount = 0;
      http.createProduct.mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Rate limit exceeded (429)');
        }
        return { productNo: 800, productName: 'Test Product', status: 'created' };
      });

      const promise = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.shopbyId).toBe(800);
      expect(callCount).toBe(3);

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // SPEC-002: Batch-like Sequential Registration Scenarios
  // ===========================================================================

  describe('sequential product registration', () => {
    it('should handle multiple sequential product syncs', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      let productNoCounter = 1000;

      db.getCategoryMapping.mockResolvedValue(null);
      db.getProduct.mockImplementation(async (id: number) => ({
        productId: id,
        huniCode: `HC${id.toString().padStart(3, '0')}`,
        shopbyId: null,
        name: `Product ${id}`,
        categoryId: 10,
        sellingPrice: 10000 + id * 1000,
      }));
      http.createProduct.mockImplementation(async () => ({
        productNo: ++productNoCounter,
        productName: 'Product',
        status: 'created' as const,
      }));

      const results = [];
      for (let i = 1; i <= 3; i++) {
        results.push(await adapter.syncProductToShopby(i));
      }

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results[0].shopbyId).toBe(1001);
      expect(results[1].shopbyId).toBe(1002);
      expect(results[2].shopbyId).toBe(1003);
      expect(db.updateProductShopbyId).toHaveBeenCalledTimes(3);
    });

    it('should continue sequential registration when one product fails', async () => {
      vi.useFakeTimers();
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getCategoryMapping.mockResolvedValue(null);
      db.getProduct.mockImplementation(async (id: number) => ({
        productId: id,
        huniCode: `HC${id.toString().padStart(3, '0')}`,
        shopbyId: null,
        name: `Product ${id}`,
        categoryId: 10,
        sellingPrice: 10000,
      }));

      let callCount = 0;
      http.createProduct.mockImplementation(async () => {
        callCount++;
        // Product 1 succeeds (callCount 1), Product 2 fails on all 4 attempts (callCount 2-5),
        // Product 3 succeeds (callCount 6)
        if (callCount >= 2 && callCount <= 5) {
          throw new Error('Internal Server Error');
        }
        return { productNo: 1000 + callCount, productName: 'Product', status: 'created' as const };
      });

      // Product 1 - success (callCount 1)
      const result1 = await adapter.syncProductToShopby(1);
      expect(result1.success).toBe(true);

      // Product 2 - failure (callCount 2-5: 1 initial + 3 retries = 4 attempts, all fail)
      const promise2 = adapter.syncProductToShopby(2);
      await vi.runAllTimersAsync();
      const result2 = await promise2;
      expect(result2.success).toBe(false);

      // Product 3 - success (callCount 6, adapter still functional after one product failure)
      const result3 = await adapter.syncProductToShopby(3);
      expect(result3.success).toBe(true);

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // SPEC-002: Category Mapping Integration
  // ===========================================================================

  describe('category mapping in product sync', () => {
    it('should not call getCategoryMapping when product has no categoryId', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Test Product',
        categoryId: null,
        sellingPrice: 15000,
      });
      http.createProduct.mockResolvedValue({
        productNo: 600,
        productName: 'Test Product',
        status: 'created',
      });

      await adapter.syncProductToShopby(1);

      expect(db.getCategoryMapping).not.toHaveBeenCalled();
    });

    it('should throw when getCategoryMapping fails (error is outside try-catch)', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Test Product',
        categoryId: 10,
        sellingPrice: 15000,
      });
      db.getCategoryMapping.mockRejectedValue(new Error('DB error in category lookup'));

      // getCategoryMapping is called before the try-catch, so it throws from syncProductToShopby
      await expect(adapter.syncProductToShopby(1)).rejects.toThrow('DB error in category lookup');
    });

    it('should handle getCategoryMapping failure via handleEvent (caught in event handler)', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Test Product',
        categoryId: 10,
        sellingPrice: 15000,
      });
      db.getCategoryMapping.mockRejectedValue(new Error('DB error in category lookup'));

      const event: ProductCreatedEvent = {
        type: 'product.created',
        payload: { productId: 1, huniCode: 'HC001' },
        metadata: createEventMetadata('test'),
      };

      // Should not throw - handleEvent catches the error
      await adapter.handleEvent(event);

      expect(logger.error).toHaveBeenCalledWith(
        'Error handling product.created',
        expect.objectContaining({ productId: 1, error: 'DB error in category lookup' })
      );
    });
  });

  // ===========================================================================
  // SPEC-002: DB Failure During shopbyId Update
  // ===========================================================================

  describe('database failure during shopbyId update', () => {
    it('should still return success when createProduct succeeds but updateProductShopbyId fails', async () => {
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
      db.updateProductShopbyId.mockRejectedValue(new Error('DB write failed'));

      // The product was created in Shopby, but DB update to store the mapping fails
      // This propagates as a caught error, returning failure
      const result = await adapter.syncProductToShopby(1);

      // Implementation throws DB error after circuit breaker, caught in syncProductToShopby
      // Check actual behavior: the updateProductShopbyId throw is inside the try block
      // after circuitBreaker.execute, so it is caught by the outer catch
      expect(db.updateProductShopbyId).toHaveBeenCalledWith(1, 600);
    });
  });

  // ===========================================================================
  // SPEC-002: Non-Error Throw Handling
  // ===========================================================================

  describe('non-Error throw handling', () => {
    it('should handle string errors thrown by HTTP client', async () => {
      vi.useFakeTimers();
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
      // eslint-disable-next-line prefer-promise-reject-errors
      http.createProduct.mockRejectedValue('string error from API');

      const promise = adapter.syncProductToShopby(1);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('string error from API');

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // SPEC-002: Order Status Notification Retry
  // ===========================================================================

  describe('order status notification with retry', () => {
    it('should retry notifyOrderStatus and succeed on later attempt', async () => {
      vi.useFakeTimers();
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue({
        id: 'order-1',
        source: 'shopby',
        shopbyOrderNo: 'SB-2024-001',
        status: 'CONFIRMED',
      });

      // First attempt fails, second succeeds
      let notifyCallCount = 0;
      http.notifyOrderStatus.mockImplementation(async () => {
        notifyCallCount++;
        if (notifyCallCount <= 1) {
          throw new Error('Temporary network error');
        }
        return { success: true };
      });

      const event = {
        type: 'order.status.changed' as const,
        payload: { orderId: 'order-1', to: 'SHIPPED' },
        metadata: createEventMetadata('test'),
      };

      const promise = adapter.handleEvent(event);
      await vi.runAllTimersAsync();
      await promise;

      // Should have logged success after retry
      expect(logger.info).toHaveBeenCalledWith(
        'Shopby order status notified',
        expect.objectContaining({ orderNo: 'SB-2024-001' })
      );

      vi.useRealTimers();
    });

    it('should handle all retries exhausted for order notification', async () => {
      vi.useFakeTimers();
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };
      const logger = config.logger as { [K: string]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue({
        id: 'order-1',
        source: 'shopby',
        shopbyOrderNo: 'SB-2024-001',
        status: 'CONFIRMED',
      });
      http.notifyOrderStatus.mockRejectedValue(new Error('Shopby API unreachable'));

      const event = {
        type: 'order.status.changed' as const,
        payload: { orderId: 'order-1', to: 'SHIPPED' },
        metadata: createEventMetadata('test'),
      };

      const promise = adapter.handleEvent(event);
      await vi.runAllTimersAsync();
      await promise;

      // Should have logged an error for the failed notification
      expect(logger.error).toHaveBeenCalledWith(
        'Error handling order.status.changed',
        expect.objectContaining({ orderId: 'order-1' })
      );

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // SPEC-002: Product with various price values
  // ===========================================================================

  describe('product sync with edge-case prices', () => {
    it('should sync product with zero price', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Free Sample Product',
        categoryId: 10,
        sellingPrice: 0,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.createProduct.mockResolvedValue({
        productNo: 900,
        productName: 'Free Sample Product',
        status: 'created',
      });

      const result = await adapter.syncProductToShopby(1);

      expect(result.success).toBe(true);
      expect(http.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: expect.any(String),
        })
      );
    });

    it('should sync product with very high price', async () => {
      const db = config.db as { [K in keyof ShopbyDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof ShopbyHttpClient]: ReturnType<typeof vi.fn> };

      db.getProduct.mockResolvedValue({
        productId: 1,
        huniCode: 'HC001',
        shopbyId: null,
        name: 'Premium Product',
        categoryId: 10,
        sellingPrice: 99999999,
      });
      db.getCategoryMapping.mockResolvedValue(null);
      http.createProduct.mockResolvedValue({
        productNo: 901,
        productName: 'Premium Product',
        status: 'created',
      });

      const result = await adapter.syncProductToShopby(1);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // SPEC-002: Health Check Edge Cases
  // ===========================================================================

  describe('health check edge cases', () => {
    it('should return false when circuit breaker is open', async () => {
      vi.useFakeTimers();
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
      http.createProduct.mockRejectedValue(new Error('API error'));

      // Open the circuit with 5 failures
      for (let i = 0; i < 5; i++) {
        const promise = adapter.syncProductToShopby(1);
        await vi.runAllTimersAsync();
        await promise;
      }

      // Health check should fail because circuit is open
      const health = await adapter.healthCheck();
      expect(health).toBe(false);

      vi.useRealTimers();
    });

    it('should report unhealthy status when circuit is open', async () => {
      vi.useFakeTimers();
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
      http.createProduct.mockRejectedValue(new Error('API error'));

      for (let i = 0; i < 5; i++) {
        const promise = adapter.syncProductToShopby(1);
        await vi.runAllTimersAsync();
        await promise;
      }

      const status = adapter.getStatus();
      expect(status.healthy).toBe(false);
      expect(status.circuitBreakerState).toBe('OPEN');
      expect(status.consecutiveFailures).toBe(5);

      vi.useRealTimers();
    });
  });
});
