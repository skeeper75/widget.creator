/**
 * Shopby Widget Event Emitter
 *
 * Type-safe event system for Shopby widget integration.
 * Bridges internal events to CustomEvent dispatch for Aurora Skin integration.
 *
 * @see SPEC-SHOPBY-003 Section: Event System
 * @MX:ANCHOR: Event system - bridges widget events to Aurora Skin via CustomEvent
 * @MX:NOTE: CustomEvents use 'widgetCreator:' prefix for external listeners
 * @MX:SPEC: SPEC-SHOPBY-003
 */

import type {
  WidgetEventMap,
  WidgetEventType,
  ShopbyWidgetCallbacks,
} from './types';

/** Event listener function signature */
type EventListener<T> = (data: T) => void;

/** Internal listener storage */
type ListenerMap = {
  [K in WidgetEventType]?: Set<EventListener<WidgetEventMap[K]>>;
};

/** CustomEvent prefix for Aurora Skin integration */
const EVENT_PREFIX = 'widgetCreator:' as const;

/**
 * Type-safe event emitter for Shopby widget events.
 * Supports both internal listeners (on/off) and DOM CustomEvent dispatch.
 */
export class EventEmitter {
  private listeners: ListenerMap = {};

  /**
   * Subscribe to an event.
   * Returns an unsubscribe function for convenience.
   */
  on<K extends WidgetEventType>(
    event: K,
    listener: EventListener<WidgetEventMap[K]>,
  ): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    const set = this.listeners[event] as Set<EventListener<WidgetEventMap[K]>>;
    set.add(listener);

    return () => this.off(event, listener);
  }

  /**
   * Unsubscribe from an event.
   */
  off<K extends WidgetEventType>(
    event: K,
    listener: EventListener<WidgetEventMap[K]>,
  ): void {
    const set = this.listeners[event] as
      | Set<EventListener<WidgetEventMap[K]>>
      | undefined;
    if (set) {
      set.delete(listener);
    }
  }

  /**
   * Emit an event to all registered listeners and dispatch a CustomEvent
   * on document for Aurora Skin integration.
   */
  emit<K extends WidgetEventType>(event: K, data: WidgetEventMap[K]): void {
    const set = this.listeners[event] as
      | Set<EventListener<WidgetEventMap[K]>>
      | undefined;
    if (set) {
      for (const listener of set) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[ShopbyWidget] Error in event listener for "${event}":`, err);
        }
      }
    }

    // Dispatch CustomEvent on document for external listeners
    dispatchCustomEvent(event, data);
  }

  /**
   * Remove all listeners for a specific event, or all events if none specified.
   */
  removeAllListeners(event?: WidgetEventType): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }

  /**
   * Get listener count for a specific event.
   */
  listenerCount(event: WidgetEventType): number {
    const set = this.listeners[event];
    return set ? set.size : 0;
  }
}

/**
 * Dispatch a CustomEvent on document for Aurora Skin integration.
 * Event names follow the pattern: widgetCreator:{eventType}
 */
export function dispatchCustomEvent<K extends WidgetEventType>(
  event: K,
  data: WidgetEventMap[K],
): void {
  if (typeof document === 'undefined') return;

  const customEvent = new CustomEvent(`${EVENT_PREFIX}${event}`, {
    detail: data,
    bubbles: true,
    cancelable: true,
  });

  document.dispatchEvent(customEvent);
}

/**
 * Connect ShopbyWidgetCallbacks from init config to the event emitter.
 * This bridges the callback-based API to the event-based internal system.
 */
export function connectCallbacks(
  emitter: EventEmitter,
  callbacks: ShopbyWidgetCallbacks,
): () => void {
  const unsubscribers: Array<() => void> = [];

  if (callbacks.onAddToCart) {
    const cb = callbacks.onAddToCart;
    unsubscribers.push(emitter.on('addToCart', cb));
  }

  if (callbacks.onBuyNow) {
    const cb = callbacks.onBuyNow;
    unsubscribers.push(emitter.on('buyNow', cb));
  }

  if (callbacks.onPriceChange) {
    const cb = callbacks.onPriceChange;
    unsubscribers.push(emitter.on('priceChange', cb));
  }

  if (callbacks.onError) {
    const cb = callbacks.onError;
    unsubscribers.push(emitter.on('error', cb));
  }

  // Return cleanup function to remove all callback listeners
  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}
