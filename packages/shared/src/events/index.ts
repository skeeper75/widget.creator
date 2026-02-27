/**
 * Events module - Domain Event System
 *
 * Provides typed event bus for decoupled communication between modules.
 */

export type {
  EventMetadata,
  DomainEvent,
  DomainEventType,
  // Product events
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeactivatedEvent,
  // Pricing events
  PriceChangedEvent,
  // Quote events
  QuoteResultPayload,
  QuoteCalculatedEvent,
  QuoteSnapshotPayload,
  QuoteSnapshotCreatedEvent,
  // Order events
  OrderSource,
  OrderStatus,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderDispatchedMesEvent,
  // Widget events
  WidgetConfigUpdatedEvent,
  // Integration events
  SyncShopbyCompletedEvent,
  MappingMesVerifiedEvent,
} from './types.js';

export {
  createEventMetadata,
  DOMAIN_EVENT_TYPES,
} from './types.js';

export type {
  EventBus,
  EventHandler,
} from './bus.js';

export {
  InProcessEventBus,
  getEventBus,
  initializeEventBus,
  resetEventBus,
} from './bus.js';

export type {
  DeadLetterStatus,
  DeadLetterRecord,
  DeadLetterQueue,
  DeadLetterRepository,
} from './dead-letter.js';

export {
  InMemoryDeadLetterQueue,
  DatabaseDeadLetterQueue,
} from './dead-letter.js';
