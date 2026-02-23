/**
 * Unit tests for MesAdapter
 *
 * Tests cover handleEvent for order.created with verified/unverified mappings,
 * dispatch to MES, status callbacks, and healthCheck.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MesAdapter } from '../adapter.js';
import type { MesAdapterConfig, MesDatabaseOps, MesHttpClient } from '../adapter.js';
import type { MesApiConfig, MesDispatchResponse } from '../types.js';
import { createEventMetadata } from '../../../events/types.js';
import type { OrderCreatedEvent } from '../../../events/types.js';

function createMockConfig(): MesAdapterConfig {
  const api: MesApiConfig = { baseUrl: 'https://mes.test' };
  const db: MesDatabaseOps = {
    getProductMesMapping: vi.fn(),
    getOptionChoiceMesMappings: vi.fn(),
    getOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
    updateOrderMesJobId: vi.fn(),
  };
  const http: MesHttpClient = {
    dispatch: vi.fn(),
    healthCheck: vi.fn(),
  };
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  return { api, db, http, logger };
}

describe('MesAdapter', () => {
  let adapter: MesAdapter;
  let config: MesAdapterConfig;

  beforeEach(() => {
    config = createMockConfig();
    adapter = new MesAdapter(config);
  });

  describe('metadata', () => {
    it('should have name "mes"', () => {
      expect(adapter.name).toBe('mes');
    });

    it('should subscribe to order.created', () => {
      expect(adapter.subscribedEvents).toContain('order.created');
    });
  });

  describe('handleEvent order.created with verified mappings', () => {
    it('should dispatch to MES when all mappings are verified', async () => {
      const db = config.db as { [K in keyof MesDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof MesHttpClient]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue({
        orderId: 'ORD-001',
        productId: 1,
        quantity: 100,
        selectedOptions: [
          { choiceId: 10, code: 'M1', value: 'Material A' },
          { choiceId: 20, code: 'P1', value: 'Process A' },
        ],
        status: 'CONFIRMED',
      });

      db.getProductMesMapping.mockResolvedValue({
        id: 1,
        mesItemId: 100,
        mesItemCode: '100-0001',
      });

      db.getOptionChoiceMesMappings.mockResolvedValue([
        { optionChoiceId: 10, mesCode: 'MAT-A', mappingType: 'material', mappingStatus: 'verified' },
        { optionChoiceId: 20, mesCode: 'PRC-A', mappingType: 'process', mappingStatus: 'verified' },
      ]);

      http.dispatch.mockResolvedValue({
        mesJobId: 'MES-JOB-001',
        itemCode: '100-0001',
        status: 'accepted',
      } satisfies MesDispatchResponse);

      const event: OrderCreatedEvent = {
        type: 'order.created',
        payload: { orderId: 'ORD-001', source: 'widget' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCode: '100-0001',
          materialCodes: ['MAT-A'],
          processCodes: ['PRC-A'],
          quantity: 100,
          orderId: 'ORD-001',
        })
      );

      expect(db.updateOrderMesJobId).toHaveBeenCalledWith('ORD-001', 'MES-JOB-001');
      expect(db.updateOrderStatus).toHaveBeenCalledWith('ORD-001', 'PRODUCTION_WAITING');
    });
  });

  describe('handleEvent order.created with pending mappings', () => {
    it('should NOT dispatch when mappings are pending', async () => {
      const db = config.db as { [K in keyof MesDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof MesHttpClient]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue({
        orderId: 'ORD-002',
        productId: 1,
        quantity: 50,
        selectedOptions: [
          { choiceId: 10, code: 'M1', value: 'Material A' },
        ],
        status: 'CONFIRMED',
      });

      db.getProductMesMapping.mockResolvedValue({
        id: 1,
        mesItemId: 100,
        mesItemCode: '100-0001',
      });

      db.getOptionChoiceMesMappings.mockResolvedValue([
        { optionChoiceId: 10, mesCode: 'MAT-A', mappingType: 'material', mappingStatus: 'pending' },
      ]);

      const event: OrderCreatedEvent = {
        type: 'order.created',
        payload: { orderId: 'ORD-002', source: 'widget' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('handleEvent with non-subscribed event', () => {
    it('should ignore events other than order.created', async () => {
      const db = config.db as { [K in keyof MesDatabaseOps]: ReturnType<typeof vi.fn> };

      await adapter.handleEvent({
        type: 'product.created',
        payload: { productId: 1, huniCode: 'HC001' },
        metadata: createEventMetadata('test'),
      });

      expect(db.getOrder).not.toHaveBeenCalled();
    });
  });

  describe('handleEvent when order not found', () => {
    it('should log warning and skip dispatch', async () => {
      const db = config.db as { [K in keyof MesDatabaseOps]: ReturnType<typeof vi.fn> };
      const http = config.http as { [K in keyof MesHttpClient]: ReturnType<typeof vi.fn> };

      db.getOrder.mockResolvedValue(null);

      const event: OrderCreatedEvent = {
        type: 'order.created',
        payload: { orderId: 'ORD-MISSING', source: 'widget' },
        metadata: createEventMetadata('test'),
      };

      await adapter.handleEvent(event);

      expect(http.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('handleStatusCallback', () => {
    it('should map MES Korean status to OrderStatus', async () => {
      const result = await adapter.handleStatusCallback({
        mesJobId: 'MES-JOB-001',
        status: '제작중',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('PRODUCING');
    });

    it('should return failure for invalid status', async () => {
      const result = await adapter.handleStatusCallback({
        mesJobId: 'MES-JOB-001',
        status: 'unknown',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return true when MES API responds', async () => {
      const http = config.http as { [K in keyof MesHttpClient]: ReturnType<typeof vi.fn> };
      http.healthCheck.mockResolvedValue(true);

      const result = await adapter.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when MES API fails', async () => {
      const http = config.http as { [K in keyof MesHttpClient]: ReturnType<typeof vi.fn> };
      http.healthCheck.mockRejectedValue(new Error('timeout'));

      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return healthy status initially', () => {
      const status = adapter.getStatus();

      expect(status.name).toBe('mes');
      expect(status.healthy).toBe(true);
      expect(status.circuitBreakerState).toBe('CLOSED');
      expect(status.consecutiveFailures).toBe(0);
    });
  });
});
