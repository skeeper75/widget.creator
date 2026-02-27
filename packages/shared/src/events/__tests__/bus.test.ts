/**
 * Unit tests for InProcessEventBus
 *
 * Tests cover subscribe/emit, handler isolation, unsubscribe,
 * correlationId preservation, and subscriberCount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InProcessEventBus } from '../bus.js';
import type { DomainEvent, ProductCreatedEvent, ProductUpdatedEvent } from '../types.js';
import { createEventMetadata } from '../types.js';

function makeProductCreatedEvent(overrides?: Partial<ProductCreatedEvent>): ProductCreatedEvent {
  return {
    type: 'product.created',
    payload: { productId: 1, huniCode: 'HC001' },
    metadata: createEventMetadata('test'),
    ...overrides,
  };
}

function makeProductUpdatedEvent(): ProductUpdatedEvent {
  return {
    type: 'product.updated',
    payload: { productId: 1, changes: { name: 'new-name' } },
    metadata: createEventMetadata('test'),
  };
}

describe('InProcessEventBus', () => {
  let bus: InProcessEventBus;
  let mockLogger: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
    };
    bus = new InProcessEventBus(mockLogger);
  });

  describe('subscribe and emit', () => {
    it('should call handler when event is emitted after subscription', async () => {
      const handler = vi.fn();
      bus.subscribe('product.created', handler);

      const event = makeProductCreatedEvent();
      bus.emit(event);

      // Handler is called asynchronously; wait for microtask
      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledWith(event);
      });
    });

    it('should call multiple handlers for the same event type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.subscribe('product.created', handler1);
      bus.subscribe('product.created', handler2);

      const event = makeProductCreatedEvent();
      bus.emit(event);

      await vi.waitFor(() => {
        expect(handler1).toHaveBeenCalledWith(event);
        expect(handler2).toHaveBeenCalledWith(event);
      });
    });

    it('should not call handlers subscribed to a different event type', async () => {
      const handler = vi.fn();
      bus.subscribe('product.updated', handler);

      bus.emit(makeProductCreatedEvent());

      // Give time for any async execution
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('handler error isolation', () => {
    it('should isolate handler errors so other handlers still execute', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('handler error'));
      const successHandler = vi.fn();

      bus.subscribe('product.created', failingHandler);
      bus.subscribe('product.created', successHandler);

      const event = makeProductCreatedEvent();
      bus.emit(event);

      await vi.waitFor(() => {
        expect(successHandler).toHaveBeenCalledWith(event);
      });

      await vi.waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    it('should log error details when a handler throws', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('test failure'));
      bus.subscribe('product.created', failingHandler);

      const event = makeProductCreatedEvent();
      bus.emit(event);

      await vi.waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Handler failed for event product.created'),
          expect.objectContaining({
            eventType: 'product.created',
            error: 'test failure',
          })
        );
      });
    });
  });

  describe('fire-and-forget behavior', () => {
    it('should return from emit() without awaiting handlers', () => {
      const handler = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );
      bus.subscribe('product.created', handler);

      // emit() should return immediately (synchronous)
      const start = Date.now();
      bus.emit(makeProductCreatedEvent());
      const elapsed = Date.now() - start;

      // Should be nearly instant (well under 1000ms)
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('unsubscribe', () => {
    it('should stop delivering events after unsubscribe() is called', async () => {
      const handler = vi.fn();
      bus.subscribe('product.created', handler);
      bus.unsubscribe('product.created', handler);

      bus.emit(makeProductCreatedEvent());

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should stop delivering events when the returned unsubscribe function is called', async () => {
      const handler = vi.fn();
      const unsub = bus.subscribe('product.created', handler);
      unsub();

      bus.emit(makeProductCreatedEvent());

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('correlationId preservation', () => {
    it('should preserve correlationId through event chain', async () => {
      const receivedCorrelationIds: string[] = [];
      const handler = vi.fn().mockImplementation((event: DomainEvent) => {
        receivedCorrelationIds.push(event.metadata.correlationId);
      });

      bus.subscribe('product.created', handler);

      const correlationId = 'test-correlation-123';
      const event = makeProductCreatedEvent({
        metadata: createEventMetadata('test', correlationId),
      });
      bus.emit(event);

      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalled();
      });

      expect(receivedCorrelationIds[0]).toBe(correlationId);
    });
  });

  describe('subscriberCount', () => {
    it('should return 0 when no subscribers exist', () => {
      expect(bus.subscriberCount('product.created')).toBe(0);
    });

    it('should return the correct count after subscribing', () => {
      bus.subscribe('product.created', vi.fn());
      bus.subscribe('product.created', vi.fn());
      bus.subscribe('product.updated', vi.fn());

      expect(bus.subscriberCount('product.created')).toBe(2);
      expect(bus.subscriberCount('product.updated')).toBe(1);
    });

    it('should decrease count after unsubscribe', () => {
      const handler = vi.fn();
      bus.subscribe('product.created', handler);
      expect(bus.subscriberCount('product.created')).toBe(1);

      bus.unsubscribe('product.created', handler);
      expect(bus.subscriberCount('product.created')).toBe(0);
    });
  });

  describe('removeAllSubscribers', () => {
    it('should remove all subscribers for all event types', async () => {
      bus.subscribe('product.created', vi.fn());
      bus.subscribe('product.updated', vi.fn());

      bus.removeAllSubscribers();

      expect(bus.subscriberCount('product.created')).toBe(0);
      expect(bus.subscriberCount('product.updated')).toBe(0);
    });
  });
});
