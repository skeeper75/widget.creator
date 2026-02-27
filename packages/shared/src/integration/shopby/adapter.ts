/**
 * Shopby Integration Adapter
 *
 * Handles product sync and order status notifications with Shopby e-commerce platform.
 */

import type { DomainEvent } from '../../events/types.js';
import type { IntegrationAdapter, AdapterStatus } from '../types.js';
import { CircuitBreaker, CIRCUIT_BREAKER_CONFIGS } from '../circuit-breaker.js';
import { retryWithBackoff, RETRY_CONFIGS } from '../retry.js';
import type {
  ShopbyApiConfig,
  ShopbyProduct,
  ShopbyProductSyncResponse,
  ShopbyOrder,
  ProductForShopbySync,
  ShopbySyncResult,
} from './types.js';
import {
  toShopbyProduct,
  fromShopbyOrder,
  toShopbyStatusNotification,
  mapToShopbyStatus,
} from './mapper.js';

/**
 * Database operations needed by Shopby adapter
 */
export interface ShopbyDatabaseOps {
  getProduct(productId: number): Promise<ProductForShopbySync | null>;
  updateProductShopbyId(productId: number, shopbyId: number): Promise<void>;
  getCategoryMapping(categoryId: number): Promise<{
    shopbyCategoryNo: number;
    categoryName: string;
  } | null>;
  createOrder(order: {
    externalOrderId: string;
    source: string;
    productId: number;
    selectedOptions: string[];
    totalPrice: number;
    customerName: string;
    customerEmail: string;
  }): Promise<string>;
  getOrder(orderId: string): Promise<{
    id: string;
    source: string;
    shopbyOrderNo: string | null;
    status: string;
  } | null>;
  updateOrderStatus(orderId: string, status: string): Promise<void>;
}

/**
 * HTTP client for Shopby API
 */
export interface ShopbyHttpClient {
  createProduct(product: ShopbyProduct): Promise<ShopbyProductSyncResponse>;
  updateProduct(productNo: number, product: ShopbyProduct): Promise<ShopbyProductSyncResponse>;
  notifyOrderStatus(notification: {
    orderNo: string;
    status: string;
    timestamp: string;
    trackingNo?: string;
    deliveryCompany?: string;
  }): Promise<{ success: boolean }>;
  healthCheck(): Promise<boolean>;
}

/**
 * Shopby Adapter configuration
 */
export interface ShopbyAdapterConfig {
  api: ShopbyApiConfig;
  db: ShopbyDatabaseOps;
  http: ShopbyHttpClient;
  logger?: {
    info: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
  };
}

/**
 * Shopby Integration Adapter
 *
 * Subscribed events:
 * - product.created: Sync new product to Shopby
 * - product.updated: Update product in Shopby
 * - order.status.changed: Notify Shopby of status change (if source is shopby)
 *
 * Uses CircuitBreaker (5 failures, 60s cooldown) + retry (3 retries, 1s-30s)
 */
export class ShopbyAdapter implements IntegrationAdapter {
  readonly name = 'shopby';
  readonly subscribedEvents = [
    'product.created',
    'product.updated',
    'order.status.changed',
  ] as const;

  private readonly circuitBreaker: CircuitBreaker;
  private readonly config: ShopbyAdapterConfig;
  private readonly logger: NonNullable<ShopbyAdapterConfig['logger']>;

  // Status tracking
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;

  constructor(config: ShopbyAdapterConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIGS.shopby);
    this.logger = config.logger ?? {
      info: console.log,
      error: console.error,
      warn: console.warn,
    };
  }

  /**
   * Handle domain events
   */
  async handleEvent(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'product.created':
        await this.handleProductCreated(event.payload.productId);
        break;
      case 'product.updated':
        await this.handleProductUpdated(event.payload.productId);
        break;
      case 'order.status.changed':
        await this.handleOrderStatusChanged(
          event.payload.orderId,
          event.payload.to
        );
        break;
    }
  }

  /**
   * Handle product.created event
   */
  private async handleProductCreated(productId: number): Promise<void> {
    try {
      const result = await this.syncProductToShopby(productId);
      if (result.success) {
        this.logger.info('Product synced to Shopby', {
          productId,
          shopbyId: result.shopbyId,
        });
      } else {
        this.logger.warn('Failed to sync product to Shopby', {
          productId,
          error: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error handling product.created', {
        productId,
        error: errorMessage,
      });
    }
  }

  /**
   * Handle product.updated event
   */
  private async handleProductUpdated(productId: number): Promise<void> {
    try {
      const result = await this.syncProductToShopby(productId);
      if (result.success) {
        this.logger.info('Product updated in Shopby', {
          productId,
          shopbyId: result.shopbyId,
        });
      } else {
        this.logger.warn('Failed to update product in Shopby', {
          productId,
          error: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error handling product.updated', {
        productId,
        error: errorMessage,
      });
    }
  }

  /**
   * Handle order.status.changed event
   */
  private async handleOrderStatusChanged(orderId: string, newStatus: string): Promise<void> {
    try {
      const order = await this.config.db.getOrder(orderId);
      if (!order || order.source !== 'shopby' || !order.shopbyOrderNo) {
        return;
      }

      const notification = toShopbyStatusNotification(order, mapToShopbyStatus(newStatus));
      if (!notification) {
        return;
      }

      await this.notifyShopbyOrderStatus(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error handling order.status.changed', {
        orderId,
        error: errorMessage,
      });
    }
  }

  /**
   * Sync a product to Shopby
   *
   * @param productId - Product ID to sync
   * @returns Sync result
   */
  async syncProductToShopby(productId: number): Promise<ShopbySyncResult> {
    const product = await this.config.db.getProduct(productId);
    if (!product) {
      return { productId, success: false, error: 'Product not found' };
    }

    const categoryMapping = product.categoryId
      ? await this.config.db.getCategoryMapping(product.categoryId)
      : null;

    const shopbyProduct = toShopbyProduct(
      { name: product.name, huniCode: product.huniCode, shopbyId: product.shopbyId },
      product.sellingPrice
    );

    try {
      let response: ShopbyProductSyncResponse;

      if (product.shopbyId) {
        // Update existing product
        response = await this.circuitBreaker.execute(() =>
          retryWithBackoff(
            () => this.config.http.updateProduct(product.shopbyId!, shopbyProduct),
            RETRY_CONFIGS.productSync
          )
        );
      } else {
        // Create new product
        response = await this.circuitBreaker.execute(() =>
          retryWithBackoff(
            () => this.config.http.createProduct(shopbyProduct),
            RETRY_CONFIGS.productSync
          )
        );
      }

      this.onSuccess();

      // Update shopby_id in database if new product
      if (response.status === 'created' && response.productNo) {
        await this.config.db.updateProductShopbyId(productId, response.productNo);
      }

      return {
        productId,
        success: true,
        shopbyId: response.productNo,
      };
    } catch (error) {
      this.onFailure(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { productId, success: false, error: errorMessage };
    }
  }

  /**
   * Create order from Shopby webhook
   *
   * @param shopbyOrder - Order from Shopby
   * @returns Created order ID
   */
  async createOrderFromWebhook(shopbyOrder: ShopbyOrder): Promise<string | null> {
    const transformed = fromShopbyOrder(shopbyOrder);

    // Note: productId lookup via shopbyId would be done in the route handler
    // This is a simplified version
    this.logger.info('Creating order from Shopby webhook', {
      orderNo: shopbyOrder.orderNo,
      customerName: transformed.customerName,
      totalPrice: transformed.totalPrice,
    });

    // Return null to indicate route handler should do the actual creation
    // with proper productId lookup
    return null;
  }

  /**
   * Notify Shopby of order status change
   */
  private async notifyShopbyOrderStatus(notification: {
    orderNo: string;
    status: string;
    timestamp: string;
    trackingNo?: string;
    deliveryCompany?: string;
  }): Promise<void> {
    try {
      await this.circuitBreaker.execute(() =>
        retryWithBackoff(
          () => this.config.http.notifyOrderStatus(notification),
          RETRY_CONFIGS.statusCallback
        )
      );

      this.onSuccess();

      this.logger.info('Shopby order status notified', {
        orderNo: notification.orderNo,
        status: notification.status,
      });
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Health check for Shopby API
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(() => this.config.http.healthCheck());
    } catch {
      return false;
    }
  }

  /**
   * Get adapter status
   */
  getStatus(): AdapterStatus {
    const cbStats = this.circuitBreaker.getStats();

    return {
      name: this.name,
      healthy: cbStats.state === 'CLOSED',
      circuitBreakerState: cbStats.state,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  // Private helper methods

  private onSuccess(): void {
    this.lastSuccessAt = new Date();
    this.consecutiveFailures = 0;
  }

  private onFailure(error: unknown): void {
    this.lastFailureAt = new Date();
    this.consecutiveFailures++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error('Shopby adapter operation failed', {
      consecutiveFailures: this.consecutiveFailures,
      error: errorMessage,
    });
  }
}
