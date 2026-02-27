/**
 * Event Bus Implementation
 *
 * In-process event bus using EventEmitter for pub/sub pattern.
 * Handler failures are isolated and do not propagate to the emitter.
 */

import { EventEmitter } from 'events';
import type { DomainEvent, DomainEventType } from './types.js';

/**
 * Event handler function type
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

/**
 * Event Bus interface for pub/sub operations
 */
export interface EventBus {
  /**
   * Emit a domain event to all subscribed handlers
   * Fire-and-forget: does not wait for handlers to complete
   * Handler errors are isolated and logged
   */
  emit(event: DomainEvent): void;

  /**
   * Subscribe to events of a specific type
   * @returns Unsubscribe function
   */
  subscribe<T extends DomainEvent>(
    type: T['type'],
    handler: EventHandler<T>
  ): () => void;

  /**
   * Unsubscribe a handler from a specific event type
   */
  unsubscribe<T extends DomainEvent>(
    type: T['type'],
    handler: EventHandler<T>
  ): void;

  /**
   * Get the number of subscribers for a specific event type
   */
  subscriberCount(type: DomainEventType): number;

  /**
   * Remove all subscribers for all event types
   */
  removeAllSubscribers(): void;
}

/**
 * In-process Event Bus implementation using EventEmitter
 *
 * CRITICAL DESIGN DECISIONS:
 * 1. Fire-and-forget: emit() does NOT await handlers
 * 2. Handler isolation: failures are caught and logged, never propagated
 * 3. Async execution: all handlers execute asynchronously
 */
export class InProcessEventBus implements EventBus {
  private readonly emitter: EventEmitter;
  private readonly logger: {
    error: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
  };

  constructor(logger?: { error: (message: string, context?: Record<string, unknown>) => void; warn: (message: string, context?: Record<string, unknown>) => void }) {
    this.emitter = new EventEmitter();
    // Default logger implementation
    this.logger = logger ?? {
      error: (message: string, context?: Record<string, unknown>) => {
        console.error(`[EventBus] ${message}`, context ?? '');
      },
      warn: (message: string, context?: Record<string, unknown>) => {
        console.warn(`[EventBus] ${message}`, context ?? '');
      },
    };
  }

  /**
   * Emit a domain event to all subscribed handlers
   *
   * CRITICAL: This is fire-and-forget. Handler failures are isolated.
   */
  emit(event: DomainEvent): void {
    const handlers = this.emitter.listeners(event.type) as EventHandler[];

    if (handlers.length === 0) {
      return;
    }

    // Execute all handlers asynchronously with error isolation
    for (const handler of handlers) {
      this.executeHandlerSafely(handler, event);
    }
  }

  /**
   * Execute a handler with error isolation
   * Handler errors are caught, logged, and do NOT propagate
   */
  private async executeHandlerSafely<T extends DomainEvent>(
    handler: EventHandler<T>,
    event: T
  ): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Handler failed for event ${event.type}`, {
        eventId: event.metadata.id,
        eventType: event.type,
        correlationId: event.metadata.correlationId,
        source: event.metadata.source,
        error: errorMessage,
        stack: errorStack,
      });
    }
  }

  /**
   * Subscribe to events of a specific type
   * @returns Unsubscribe function
   */
  subscribe<T extends DomainEvent>(
    type: T['type'],
    handler: EventHandler<T>
  ): () => void {
    this.emitter.on(type, handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(type, handler);
    };
  }

  /**
   * Unsubscribe a handler from a specific event type
   */
  unsubscribe<T extends DomainEvent>(
    type: T['type'],
    handler: EventHandler<T>
  ): void {
    this.emitter.off(type, handler as EventHandler);
  }

  /**
   * Get the number of subscribers for a specific event type
   */
  subscriberCount(type: DomainEventType): number {
    return this.emitter.listenerCount(type);
  }

  /**
   * Remove all subscribers for all event types
   */
  removeAllSubscribers(): void {
    this.emitter.removeAllListeners();
  }
}

/**
 * Singleton event bus instance for the application
 * Initialize once at application startup
 */
let globalEventBus: EventBus | null = null;

/**
 * Get the global event bus instance
 * @throws Error if event bus has not been initialized
 */
export function getEventBus(): EventBus {
  if (!globalEventBus) {
    throw new Error('EventBus not initialized. Call initializeEventBus() first.');
  }
  return globalEventBus;
}

/**
 * Initialize the global event bus
 * Should be called once at application startup
 */
export function initializeEventBus(logger?: {
  error: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
}): EventBus {
  if (globalEventBus) {
    // Use provided logger or console as fallback
    if (logger) {
      logger.warn('EventBus already initialized, returning existing instance');
    } else {
      console.warn('[EventBus] EventBus already initialized, returning existing instance');
    }
    return globalEventBus;
  }
  globalEventBus = new InProcessEventBus(logger);
  return globalEventBus;
}

/**
 * Reset the global event bus (for testing)
 */
export function resetEventBus(): void {
  if (globalEventBus) {
    globalEventBus.removeAllSubscribers();
    globalEventBus = null;
  }
}
