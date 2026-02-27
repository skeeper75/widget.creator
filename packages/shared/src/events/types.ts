/**
 * Domain Event Types for Widget Creator
 *
 * Event types follow a discriminated union pattern for type-safe event handling.
 * All events include metadata for tracing and correlation.
 */

import { randomUUID } from 'crypto';

/**
 * Event metadata attached to every domain event
 */
export interface EventMetadata {
  /** UUID v4 unique identifier for this event instance */
  id: string;
  /** Timestamp when the event was created */
  timestamp: Date;
  /** Correlation ID for tracing across systems and handlers */
  correlationId: string;
  /** Source module that emitted this event */
  source: string;
}

/**
 * Factory function to create event metadata
 */
export function createEventMetadata(source: string, correlationId?: string): EventMetadata {
  return {
    id: randomUUID(),
    timestamp: new Date(),
    correlationId: correlationId ?? randomUUID(),
    source,
  };
}

// ============================================================================
// Product Lifecycle Events
// ============================================================================

export interface ProductCreatedEvent {
  type: 'product.created';
  payload: {
    productId: number;
    huniCode: string;
  };
  metadata: EventMetadata;
}

export interface ProductUpdatedEvent {
  type: 'product.updated';
  payload: {
    productId: number;
    changes: Record<string, unknown>;
  };
  metadata: EventMetadata;
}

export interface ProductDeactivatedEvent {
  type: 'product.deactivated';
  payload: {
    productId: number;
  };
  metadata: EventMetadata;
}

// ============================================================================
// Pricing Events
// ============================================================================

export interface PriceChangedEvent {
  type: 'price.changed';
  payload: {
    productId: number;
    priceTableId: number;
  };
  metadata: EventMetadata;
}

// ============================================================================
// Quote Events
// ============================================================================

/**
 * Quote result payload for quote.calculated event
 */
export interface QuoteResultPayload {
  quoteId: string;
  productId: number;
  totalPrice: number;
  currency: string;
}

export interface QuoteCalculatedEvent {
  type: 'quote.calculated';
  payload: QuoteResultPayload;
  metadata: EventMetadata;
}

/**
 * Quote snapshot payload for quote.snapshot.created event
 */
export interface QuoteSnapshotPayload {
  quoteId: string;
  snapshot: Record<string, unknown>;
}

export interface QuoteSnapshotCreatedEvent {
  type: 'quote.snapshot.created';
  payload: QuoteSnapshotPayload;
  metadata: EventMetadata;
}

// ============================================================================
// Order Events
// ============================================================================

export type OrderSource = 'widget' | 'shopby' | 'admin';

export interface OrderCreatedEvent {
  type: 'order.created';
  payload: {
    orderId: string;
    source: OrderSource;
  };
  metadata: EventMetadata;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PRODUCTION_WAITING'
  | 'PRODUCING'
  | 'PRODUCTION_DONE'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderStatusChangedEvent {
  type: 'order.status.changed';
  payload: {
    orderId: string;
    from: OrderStatus;
    to: OrderStatus;
  };
  metadata: EventMetadata;
}

export interface OrderDispatchedMesEvent {
  type: 'order.dispatched.mes';
  payload: {
    orderId: string;
    mesJobId: string;
  };
  metadata: EventMetadata;
}

// ============================================================================
// Widget Events
// ============================================================================

export interface WidgetConfigUpdatedEvent {
  type: 'widget.config.updated';
  payload: {
    widgetId: string;
  };
  metadata: EventMetadata;
}

// ============================================================================
// Integration Events
// ============================================================================

export interface SyncShopbyCompletedEvent {
  type: 'sync.shopby.completed';
  payload: {
    productId: number;
    shopbyId: number;
  };
  metadata: EventMetadata;
}

export interface MappingMesVerifiedEvent {
  type: 'mapping.mes.verified';
  payload: {
    choiceId: number;
    mesItemId: number;
  };
  metadata: EventMetadata;
}

// ============================================================================
// Domain Event Union
// ============================================================================

/**
 * Discriminated union of all domain events in the system
 */
export type DomainEvent =
  | ProductCreatedEvent
  | ProductUpdatedEvent
  | ProductDeactivatedEvent
  | PriceChangedEvent
  | QuoteCalculatedEvent
  | QuoteSnapshotCreatedEvent
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | OrderDispatchedMesEvent
  | WidgetConfigUpdatedEvent
  | SyncShopbyCompletedEvent
  | MappingMesVerifiedEvent;

/**
 * All event type strings for type guards and subscription filtering
 */
export type DomainEventType = DomainEvent['type'];

export const DOMAIN_EVENT_TYPES: readonly DomainEventType[] = [
  'product.created',
  'product.updated',
  'product.deactivated',
  'price.changed',
  'quote.calculated',
  'quote.snapshot.created',
  'order.created',
  'order.status.changed',
  'order.dispatched.mes',
  'widget.config.updated',
  'sync.shopby.completed',
  'mapping.mes.verified',
] as const;
