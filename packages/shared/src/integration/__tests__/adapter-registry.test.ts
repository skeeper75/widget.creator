/**
 * Unit tests for InMemoryAdapterRegistry
 *
 * Tests cover register, getAdapter, getAllAdapters, unregister,
 * getHealthStatus, and getAdaptersForEvent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryAdapterRegistry } from '../adapter-registry.js';
import type { IntegrationAdapter, AdapterStatus } from '../types.js';
import type { DomainEvent, DomainEventType } from '../../events/types.js';

function createMockAdapter(
  name: string,
  subscribedEvents: DomainEventType[] = [],
  healthy = true
): IntegrationAdapter {
  return {
    name,
    subscribedEvents,
    handleEvent: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockResolvedValue(healthy),
    getStatus: vi.fn().mockReturnValue({
      name,
      healthy,
      circuitBreakerState: healthy ? 'CLOSED' : 'OPEN',
      lastSuccessAt: healthy ? new Date() : null,
      lastFailureAt: healthy ? null : new Date(),
      consecutiveFailures: healthy ? 0 : 3,
    } satisfies AdapterStatus),
  };
}

describe('InMemoryAdapterRegistry', () => {
  let registry: InMemoryAdapterRegistry;

  beforeEach(() => {
    registry = new InMemoryAdapterRegistry();
  });

  describe('register', () => {
    it('should register an adapter', () => {
      const adapter = createMockAdapter('shopby');
      registry.register(adapter);

      expect(registry.getAdapter('shopby')).toBe(adapter);
    });

    it('should throw when registering duplicate adapter name', () => {
      const adapter1 = createMockAdapter('shopby');
      const adapter2 = createMockAdapter('shopby');
      registry.register(adapter1);

      expect(() => registry.register(adapter2)).toThrow("Adapter 'shopby' is already registered");
    });
  });

  describe('getAllAdapters', () => {
    it('should return all registered adapters', () => {
      const shopby = createMockAdapter('shopby');
      const mes = createMockAdapter('mes');
      registry.register(shopby);
      registry.register(mes);

      const all = registry.getAllAdapters();

      expect(all).toHaveLength(2);
      expect(all).toContain(shopby);
      expect(all).toContain(mes);
    });

    it('should return empty array when no adapters registered', () => {
      expect(registry.getAllAdapters()).toHaveLength(0);
    });
  });

  describe('getAdapter', () => {
    it('should return the correct adapter by name', () => {
      const shopby = createMockAdapter('shopby');
      const mes = createMockAdapter('mes');
      registry.register(shopby);
      registry.register(mes);

      expect(registry.getAdapter('shopby')).toBe(shopby);
      expect(registry.getAdapter('mes')).toBe(mes);
    });

    it('should return undefined for unregistered adapter', () => {
      expect(registry.getAdapter('nonexistent')).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('should remove adapter by name', () => {
      const adapter = createMockAdapter('shopby');
      registry.register(adapter);

      registry.unregister('shopby');

      expect(registry.getAdapter('shopby')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent adapter', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });

    it('should leave other adapters intact after unregister', () => {
      const shopby = createMockAdapter('shopby');
      const mes = createMockAdapter('mes');
      registry.register(shopby);
      registry.register(mes);

      registry.unregister('shopby');

      expect(registry.getAdapter('mes')).toBe(mes);
      expect(registry.getAllAdapters()).toHaveLength(1);
    });
  });

  describe('getHealthStatus', () => {
    it('should aggregate health from all adapters', async () => {
      const shopby = createMockAdapter('shopby', [], true);
      const mes = createMockAdapter('mes', [], true);
      registry.register(shopby);
      registry.register(mes);

      const status = await registry.getHealthStatus();

      expect(status['shopby'].healthy).toBe(true);
      expect(status['mes'].healthy).toBe(true);
    });

    it('should show unhealthy adapter correctly', async () => {
      const healthy = createMockAdapter('shopby', [], true);
      const unhealthy = createMockAdapter('mes', [], false);
      registry.register(healthy);
      registry.register(unhealthy);

      const status = await registry.getHealthStatus();

      expect(status['shopby'].healthy).toBe(true);
      expect(status['mes'].healthy).toBe(false);
    });

    it('should mark adapter as unhealthy when healthCheck throws', async () => {
      const adapter = createMockAdapter('shopby', [], true);
      (adapter.healthCheck as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('connection refused')
      );
      registry.register(adapter);

      const status = await registry.getHealthStatus();

      expect(status['shopby'].healthy).toBe(false);
    });

    it('should not affect other adapters when one fails health check', async () => {
      const healthy = createMockAdapter('shopby', [], true);
      const failing = createMockAdapter('mes', [], true);
      (failing.healthCheck as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('timeout')
      );
      registry.register(healthy);
      registry.register(failing);

      const status = await registry.getHealthStatus();

      expect(status['shopby'].healthy).toBe(true);
      expect(status['mes'].healthy).toBe(false);
    });
  });

  describe('getAdaptersForEvent', () => {
    it('should return adapters subscribed to the event type', () => {
      const shopby = createMockAdapter('shopby', ['product.created', 'product.updated']);
      const mes = createMockAdapter('mes', ['order.created']);
      registry.register(shopby);
      registry.register(mes);

      const productAdapters = registry.getAdaptersForEvent('product.created');

      expect(productAdapters).toHaveLength(1);
      expect(productAdapters[0]).toBe(shopby);
    });

    it('should return multiple adapters subscribed to the same event', () => {
      const shopby = createMockAdapter('shopby', ['order.created']);
      const mes = createMockAdapter('mes', ['order.created']);
      registry.register(shopby);
      registry.register(mes);

      const orderAdapters = registry.getAdaptersForEvent('order.created');

      expect(orderAdapters).toHaveLength(2);
    });

    it('should return empty array when no adapters subscribe to event', () => {
      const shopby = createMockAdapter('shopby', ['product.created']);
      registry.register(shopby);

      expect(registry.getAdaptersForEvent('order.created')).toHaveLength(0);
    });
  });

  describe('count and has', () => {
    it('should return correct count', () => {
      expect(registry.count).toBe(0);

      registry.register(createMockAdapter('shopby'));
      expect(registry.count).toBe(1);

      registry.register(createMockAdapter('mes'));
      expect(registry.count).toBe(2);
    });

    it('should check existence with has()', () => {
      registry.register(createMockAdapter('shopby'));

      expect(registry.has('shopby')).toBe(true);
      expect(registry.has('mes')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all adapters', () => {
      registry.register(createMockAdapter('shopby'));
      registry.register(createMockAdapter('mes'));

      registry.clear();

      expect(registry.count).toBe(0);
      expect(registry.getAllAdapters()).toHaveLength(0);
    });
  });
});
