/**
 * Shopby Event Emitter Tests
 * @see SPEC-SHOPBY-003 Section 3.2 (custom event system)
 *
 * Tests custom event dispatch on document for widget-host communication.
 * Event prefix: widgetCreator:*
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EventEmitter,
  dispatchCustomEvent,
  connectCallbacks,
} from '@/shopby/event-emitter';
import type {
  WidgetEventType,
  ShopbyWidgetCallbacks,
  WidgetToShopbyPayload,
  PriceSyncResult,
  ShopbyWidgetError,
} from '@/shopby/types';

describe('shopby/event-emitter', () => {
  let emitter: EventEmitter;
  let documentEventListener: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    emitter = new EventEmitter();
    documentEventListener = vi.spyOn(document, 'dispatchEvent');
  });

  afterEach(() => {
    emitter.removeAllListeners();
    vi.restoreAllMocks();
  });

  describe('on() - subscribe to events', () => {
    it('registers callback for a specific event', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);

      expect(emitter.listenerCount('priceChange')).toBe(1);
    });

    it('supports multiple listeners on same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.on('priceChange', callback1);
      emitter.on('priceChange', callback2);

      expect(emitter.listenerCount('priceChange')).toBe(2);
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = emitter.on('priceChange', callback);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      expect(emitter.listenerCount('priceChange')).toBe(0);
    });

    it('does not invoke callback on registration', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('supports different event types', () => {
      const priceCallback = vi.fn();
      const errorCallback = vi.fn();

      emitter.on('priceChange', priceCallback);
      emitter.on('error', errorCallback);

      expect(emitter.listenerCount('priceChange')).toBe(1);
      expect(emitter.listenerCount('error')).toBe(1);
    });
  });

  describe('off() - unsubscribe from events', () => {
    it('removes specific callback from event', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);
      emitter.off('priceChange', callback);

      expect(emitter.listenerCount('priceChange')).toBe(0);
    });

    it('does not affect other listeners on same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.on('priceChange', callback1);
      emitter.on('priceChange', callback2);
      emitter.off('priceChange', callback1);

      expect(emitter.listenerCount('priceChange')).toBe(1);
    });

    it('handles removing non-existent listener gracefully', () => {
      const callback = vi.fn();

      expect(() => emitter.off('priceChange', callback)).not.toThrow();
    });

    it('handles removing listener from non-existent event', () => {
      const callback = vi.fn();

      expect(() => emitter.off('nonExistent', callback)).not.toThrow();
    });
  });

  describe('emit() - dispatch events', () => {
    it('dispatches CustomEvent on document', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);

      const payload: PriceSyncResult = {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      };

      emitter.emit('priceChange', payload);

      expect(documentEventListener).toHaveBeenCalled();
    });

    it('includes payload in event detail', () => {
      let capturedDetail: PriceSyncResult | undefined;
      const handler = (e: Event) => {
        capturedDetail = (e as CustomEvent).detail;
      };
      document.addEventListener('widgetCreator:priceChange', handler);

      const payload: PriceSyncResult = {
        widgetPrice: 10000,
        shopbyPrice: 10500,
        discrepancy: 500,
        isWithinTolerance: true,
        tolerance: 0.1,
      };

      emitter.emit('priceChange', payload);

      expect(capturedDetail).toEqual(payload);

      document.removeEventListener('widgetCreator:priceChange', handler);
    });

    it('invokes registered callbacks with correct payload', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);

      const payload: PriceSyncResult = {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      };

      emitter.emit('priceChange', payload);

      expect(callback).toHaveBeenCalledWith(payload);
    });

    it('prefixes event name with widgetCreator:', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);

      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('widgetCreator:priceChange');
    });

    it('dispatches event even with no listeners', () => {
      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      expect(documentEventListener).toHaveBeenCalled();
    });

    it('creates bubbling event', () => {
      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.bubbles).toBe(true);
    });

    it('creates cancelable event', () => {
      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.cancelable).toBe(true);
    });
  });

  describe('callback invocation', () => {
    it('invokes callback with event detail as argument', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);

      const payload: PriceSyncResult = {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      };

      emitter.emit('priceChange', payload);

      expect(callback).toHaveBeenCalledWith(payload);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('invokes multiple callbacks in registration order', () => {
      const order: number[] = [];
      const callback1 = () => order.push(1);
      const callback2 = () => order.push(2);
      const callback3 = () => order.push(3);

      emitter.on('priceChange', callback1);
      emitter.on('priceChange', callback2);
      emitter.on('priceChange', callback3);

      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      expect(order).toEqual([1, 2, 3]);
    });

    it('does not invoke unsubscribed callback', () => {
      const callback = vi.fn();
      emitter.on('priceChange', callback);
      emitter.off('priceChange', callback);

      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('handles callback that throws without crashing other listeners', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = vi.fn();

      emitter.on('priceChange', errorCallback);
      emitter.on('priceChange', successCallback);

      // Suppress console.error from the emitter
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      expect(successCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles callback that throws without crashing emit', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });

      emitter.on('priceChange', errorCallback);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() =>
        emitter.emit('priceChange', {
          widgetPrice: 10000,
          shopbyPrice: 10000,
          discrepancy: 0,
          isWithinTolerance: true,
          tolerance: 0.1,
        })
      ).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('unsubscribe via returned function', () => {
    it('returned function removes only that listener', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = emitter.on('priceChange', callback1);
      emitter.on('priceChange', callback2);

      unsubscribe1();

      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('calling unsubscribe twice is safe', () => {
      const callback = vi.fn();
      const unsubscribe = emitter.on('priceChange', callback);

      unsubscribe();
      unsubscribe(); // Should not throw

      expect(emitter.listenerCount('priceChange')).toBe(0);
    });

    it('unsubscribed listener does not receive subsequent events', () => {
      const callback = vi.fn();
      const unsubscribe = emitter.on('priceChange', callback);

      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      });
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('specific events', () => {
    it('emits widgetCreator:addToCart with cart data', () => {
      const payload: WidgetToShopbyPayload = {
        productNo: 12345,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: {
          designFileUrl: 'https://example.com/file.pdf',
          printSpec: JSON.stringify({ size: 'A4' }),
        },
        widgetPrice: {
          basePrice: 50000,
          optionPrice: 10000,
          postProcessPrice: 5000,
          deliveryPrice: 3000,
          totalPrice: 68000,
        },
      };

      emitter.emit('addToCart', payload);

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('widgetCreator:addToCart');
      expect(dispatchedEvent.detail).toEqual(payload);
    });

    it('emits widgetCreator:buyNow with order data', () => {
      const payload: WidgetToShopbyPayload = {
        productNo: 12345,
        optionNo: 1,
        orderCnt: 100,
        optionInputs: {
          designFileUrl: 'https://example.com/file.pdf',
          printSpec: JSON.stringify({ size: 'A4' }),
        },
        widgetPrice: {
          basePrice: 50000,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 50000,
        },
      };

      emitter.emit('buyNow', payload);

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('widgetCreator:buyNow');
    });

    it('emits widgetCreator:priceChange with price info', () => {
      const payload: PriceSyncResult = {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      };

      emitter.emit('priceChange', payload);

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('widgetCreator:priceChange');
    });

    it('emits widgetCreator:error with error details', () => {
      const error: ShopbyWidgetError = {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      };

      emitter.emit('error', error);

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('widgetCreator:error');
      expect(dispatchedEvent.detail).toEqual(error);
    });

    it('emits widgetCreator:ready on widget ready', () => {
      emitter.emit('ready', { state: 'READY' });

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('widgetCreator:ready');
    });

    it('emits widgetCreator:stateChange on state change', () => {
      emitter.emit('stateChange', { from: 'IDLE', to: 'LOADING' });

      const dispatchedEvent = documentEventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('widgetCreator:stateChange');
    });
  });

  describe('removeAllListeners()', () => {
    it('removes all listeners for a specific event', () => {
      emitter.on('priceChange', vi.fn());
      emitter.on('priceChange', vi.fn());
      emitter.on('error', vi.fn());

      emitter.removeAllListeners('priceChange');

      expect(emitter.listenerCount('priceChange')).toBe(0);
      expect(emitter.listenerCount('error')).toBe(1);
    });

    it('removes all listeners for all events when no event specified', () => {
      emitter.on('priceChange', vi.fn());
      emitter.on('error', vi.fn());
      emitter.on('ready', vi.fn());

      emitter.removeAllListeners();

      expect(emitter.listenerCount('priceChange')).toBe(0);
      expect(emitter.listenerCount('error')).toBe(0);
      expect(emitter.listenerCount('ready')).toBe(0);
    });
  });

  describe('listenerCount()', () => {
    it('returns 0 for events with no listeners', () => {
      expect(emitter.listenerCount('priceChange')).toBe(0);
    });

    it('returns correct count after adding listeners', () => {
      emitter.on('priceChange', vi.fn());
      emitter.on('priceChange', vi.fn());

      expect(emitter.listenerCount('priceChange')).toBe(2);
    });

    it('returns 0 after removing all listeners', () => {
      emitter.on('priceChange', vi.fn());
      emitter.removeAllListeners('priceChange');

      expect(emitter.listenerCount('priceChange')).toBe(0);
    });
  });
});

describe('dispatchCustomEvent()', () => {
  it('dispatches CustomEvent with prefixed name', () => {
    const documentSpy = vi.spyOn(document, 'dispatchEvent');

    dispatchCustomEvent('priceChange', {
      widgetPrice: 10000,
      shopbyPrice: 10000,
      discrepancy: 0,
      isWithinTolerance: true,
      tolerance: 0.1,
    });

    const event = documentSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('widgetCreator:priceChange');
  });

  it('handles SSR (document undefined)', () => {
    // In test environment, document exists
    // This test documents the expected behavior
    expect(() =>
      dispatchCustomEvent('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      })
    ).not.toThrow();
  });
});

describe('connectCallbacks()', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.removeAllListeners();
  });

  it('connects onAddToCart callback', () => {
    const onAddToCart = vi.fn();
    const callbacks: ShopbyWidgetCallbacks = { onAddToCart };

    const cleanup = connectCallbacks(emitter, callbacks);

    const payload: WidgetToShopbyPayload = {
      productNo: 1,
      optionNo: 1,
      orderCnt: 100,
      optionInputs: {
        designFileUrl: 'https://example.com/file.pdf',
        printSpec: '{}',
      },
      widgetPrice: {
        basePrice: 10000,
        optionPrice: 0,
        postProcessPrice: 0,
        deliveryPrice: 0,
        totalPrice: 10000,
      },
    };
    emitter.emit('addToCart', payload);

    expect(onAddToCart).toHaveBeenCalledWith(payload);

    cleanup();
  });

  it('connects onBuyNow callback', () => {
    const onBuyNow = vi.fn();
    const callbacks: ShopbyWidgetCallbacks = { onBuyNow };

    connectCallbacks(emitter, callbacks);

    emitter.emit('buyNow', {
      productNo: 1,
      optionNo: 1,
      orderCnt: 100,
      optionInputs: {
        designFileUrl: '',
        printSpec: '',
      },
      widgetPrice: {
        basePrice: 0,
        optionPrice: 0,
        postProcessPrice: 0,
        deliveryPrice: 0,
        totalPrice: 0,
      },
    });

    expect(onBuyNow).toHaveBeenCalled();
  });

  it('connects onPriceChange callback', () => {
    const onPriceChange = vi.fn();
    const callbacks: ShopbyWidgetCallbacks = { onPriceChange };

    connectCallbacks(emitter, callbacks);

    emitter.emit('priceChange', {
      widgetPrice: 10000,
      shopbyPrice: 10000,
      discrepancy: 0,
      isWithinTolerance: true,
      tolerance: 0.1,
    });

    expect(onPriceChange).toHaveBeenCalled();
  });

  it('connects onError callback', () => {
    const onError = vi.fn();
    const callbacks: ShopbyWidgetCallbacks = { onError };

    connectCallbacks(emitter, callbacks);

    emitter.emit('error', {
      code: 'NETWORK_ERROR',
      message: 'Network error',
    });

    expect(onError).toHaveBeenCalled();
  });

  it('returns cleanup function that removes all listeners', () => {
    const onPriceChange = vi.fn();
    const callbacks: ShopbyWidgetCallbacks = { onPriceChange };

    const cleanup = connectCallbacks(emitter, callbacks);

    cleanup();

    emitter.emit('priceChange', {
      widgetPrice: 10000,
      shopbyPrice: 10000,
      discrepancy: 0,
      isWithinTolerance: true,
      tolerance: 0.1,
    });

    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it('handles empty callbacks object', () => {
    const cleanup = connectCallbacks(emitter, {});

    expect(cleanup).toBeTypeOf('function');
    cleanup();
  });

  it('handles callbacks with undefined values', () => {
    const callbacks: ShopbyWidgetCallbacks = {
      onAddToCart: undefined,
      onPriceChange: undefined,
    };

    const cleanup = connectCallbacks(emitter, callbacks);

    expect(() =>
      emitter.emit('priceChange', {
        widgetPrice: 10000,
        shopbyPrice: 10000,
        discrepancy: 0,
        isWithinTolerance: true,
        tolerance: 0.1,
      })
    ).not.toThrow();

    cleanup();
  });
});
