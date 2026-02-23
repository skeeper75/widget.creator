/**
 * MES Integration Adapter
 *
 * Handles order dispatch and status tracking with Manufacturing Execution System.
 */

import type { DomainEvent } from '../../events/types.js';
import type { IntegrationAdapter, AdapterStatus, CircuitBreakerState } from '../types.js';
import { CircuitBreaker, CIRCUIT_BREAKER_CONFIGS } from '../circuit-breaker.js';
import { retryWithBackoff, RETRY_CONFIGS } from '../retry.js';
import type { MesApiConfig, MesDispatchRequest, MesDispatchResponse } from './types.js';
import { toMesDispatch, verifyMesMappings, mapMesStatus } from './mapper.js';

/**
 * Database operations needed by MES adapter
 */
export interface MesDatabaseOps {
  getProductMesMapping(productId: number): Promise<{
    id: number;
    mesItemId: number;
    mesItemCode: string;
  } | null>;
  getOptionChoiceMesMappings(choiceIds: number[]): Promise<Array<{
    optionChoiceId: number;
    mesCode: string | null;
    mappingType: 'material' | 'process';
    mappingStatus: 'pending' | 'mapped' | 'verified';
  }>>;
  getOrder(orderId: string): Promise<{
    orderId: string;
    productId: number;
    quantity: number;
    selectedOptions: Array<{ choiceId: number; code: string; value: string }>;
    status: string;
  } | null>;
  updateOrderStatus(orderId: string, status: string): Promise<void>;
  updateOrderMesJobId(orderId: string, mesJobId: string): Promise<void>;
}

/**
 * HTTP client for MES API
 */
export interface MesHttpClient {
  dispatch(request: MesDispatchRequest): Promise<MesDispatchResponse>;
  healthCheck(): Promise<boolean>;
}

/**
 * MES Adapter configuration
 */
export interface MesAdapterConfig {
  api: MesApiConfig;
  db: MesDatabaseOps;
  http: MesHttpClient;
  logger?: {
    info: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
  };
}

/**
 * MES Integration Adapter
 *
 * Subscribed events:
 * - order.created: Dispatch to MES if all mappings verified
 *
 * Uses CircuitBreaker (5 failures, 60s cooldown) + retry (3 retries, 1s-30s)
 */
export class MesAdapter implements IntegrationAdapter {
  readonly name = 'mes';
  readonly subscribedEvents = ['order.created'] as const;

  private readonly circuitBreaker: CircuitBreaker;
  private readonly config: MesAdapterConfig;
  private readonly logger: NonNullable<MesAdapterConfig['logger']>;

  // Status tracking
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;

  constructor(config: MesAdapterConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIGS.mes);
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
    if (event.type !== 'order.created') {
      return;
    }

    const { orderId, source } = event.payload;

    this.logger.info('Processing order.created event', {
      orderId,
      source,
      eventId: event.metadata.id,
    });

    try {
      await this.dispatchOrderToMes(orderId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to dispatch order to MES', {
        orderId,
        error: errorMessage,
        eventId: event.metadata.id,
      });
      // Do not rethrow - errors are isolated
    }
  }

  /**
   * Dispatch an order to MES
   */
  private async dispatchOrderToMes(orderId: string): Promise<void> {
    // Get order from database
    const order = await this.config.db.getOrder(orderId);
    if (!order) {
      this.logger.warn('Order not found for MES dispatch', { orderId });
      return;
    }

    // Get product MES mapping
    const productMapping = await this.config.db.getProductMesMapping(order.productId);
    if (!productMapping) {
      this.logger.warn('Product has no MES mapping', {
        orderId,
        productId: order.productId,
      });
      return;
    }

    // Get option choice IDs
    const choiceIds = order.selectedOptions.map((o) => o.choiceId);

    // Get option MES mappings
    const optionMappings = await this.config.db.getOptionChoiceMesMappings(choiceIds);

    // Verify all mappings are verified
    const verification = verifyMesMappings(
      order,
      { id: productMapping.id, productId: order.productId, mesItemId: productMapping.mesItemId, coverType: null, isActive: true },
      optionMappings,
      { itemCode: productMapping.mesItemCode }
    );

    if (!verification.valid) {
      this.logger.warn('Order has unverified MES mappings, skipping dispatch', {
        orderId,
        unmappedChoices: verification.unmappedChoices,
      });
      return;
    }

    // Build dispatch request
    const dispatchRequest = toMesDispatch(
      order,
      { id: productMapping.id, productId: order.productId, mesItemId: productMapping.mesItemId, coverType: null, isActive: true },
      optionMappings,
      { itemCode: productMapping.mesItemCode }
    );

    if (!dispatchRequest) {
      this.logger.warn('Failed to build MES dispatch request', { orderId });
      return;
    }

    // Dispatch with circuit breaker and retry
    try {
      const response = await this.circuitBreaker.execute(() =>
        retryWithBackoff(
          () => this.config.http.dispatch(dispatchRequest),
          RETRY_CONFIGS.orderDispatch
        )
      );

      this.onSuccess();

      // Update order with MES job ID
      await this.config.db.updateOrderMesJobId(orderId, response.mesJobId);

      // Update order status to PRODUCTION_WAITING
      await this.config.db.updateOrderStatus(orderId, 'PRODUCTION_WAITING');

      this.logger.info('Order dispatched to MES successfully', {
        orderId,
        mesJobId: response.mesJobId,
        itemCode: dispatchRequest.itemCode,
      });
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle MES status callback
   */
  async handleStatusCallback(callback: {
    mesJobId: string;
    status: string;
    barcode?: string;
  }): Promise<{ success: boolean; newStatus?: string }> {
    const orderStatus = mapMesStatus(callback.status);

    if (!orderStatus) {
      this.logger.warn('Invalid MES status received', {
        mesJobId: callback.mesJobId,
        status: callback.status,
      });
      return { success: false };
    }

    // In a real implementation, we would look up the order by mesJobId
    // and update its status
    this.logger.info('MES status callback received', {
      mesJobId: callback.mesJobId,
      mesStatus: callback.status,
      orderStatus,
      barcode: callback.barcode,
    });

    return { success: true, newStatus: orderStatus };
  }

  /**
   * Health check for MES API
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
      circuitBreakerState: cbStats.state as CircuitBreakerState,
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
    this.logger.error('MES adapter operation failed', {
      consecutiveFailures: this.consecutiveFailures,
      error: errorMessage,
    });
  }
}
