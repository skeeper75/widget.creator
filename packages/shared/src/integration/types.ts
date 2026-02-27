/**
 * Integration Types
 *
 * Core interfaces for external system adapters.
 */

import type { DomainEvent, DomainEventType } from '../events/types.js';

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Adapter health status information
 */
export interface AdapterStatus {
  /** Adapter name */
  name: string;
  /** Whether the adapter is healthy */
  healthy: boolean;
  /** Current circuit breaker state */
  circuitBreakerState: CircuitBreakerState;
  /** Timestamp of last successful operation */
  lastSuccessAt: Date | null;
  /** Timestamp of last failed operation */
  lastFailureAt: Date | null;
  /** Number of consecutive failures */
  consecutiveFailures: number;
}

/**
 * Integration Adapter interface
 *
 * All external system adapters must implement this interface.
 */
export interface IntegrationAdapter {
  /** Unique adapter name */
  readonly name: string;

  /** Event types this adapter subscribes to */
  readonly subscribedEvents: ReadonlyArray<DomainEventType>;

  /**
   * Handle a domain event
   * Implementations should handle errors internally and not throw
   */
  handleEvent(event: DomainEvent): Promise<void>;

  /**
   * Check if the external system is healthy
   * @returns true if healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get current adapter status
   */
  getStatus(): AdapterStatus;
}

/**
 * Adapter Registry interface
 *
 * Manages adapter registration, discovery, and health monitoring.
 */
export interface AdapterRegistry {
  /**
   * Register an adapter
   * @throws Error if adapter with same name already registered
   */
  register(adapter: IntegrationAdapter): void;

  /**
   * Unregister an adapter by name
   */
  unregister(name: string): void;

  /**
   * Get an adapter by name
   */
  getAdapter(name: string): IntegrationAdapter | undefined;

  /**
   * Get all registered adapters
   */
  getAllAdapters(): ReadonlyArray<IntegrationAdapter>;

  /**
   * Get health status of all adapters
   */
  getHealthStatus(): Promise<Record<string, AdapterStatus>>;

  /**
   * Get adapters subscribed to a specific event type
   */
  getAdaptersForEvent(eventType: DomainEventType): ReadonlyArray<IntegrationAdapter>;
}

/**
 * Configuration for external API clients
 */
export interface ApiClientConfig {
  /** Base URL for the API */
  baseUrl: string;
  /** API key for authentication (optional) */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether the sync was successful */
  success: boolean;
  /** External system ID (if applicable) */
  externalId?: string | number;
  /** Error message (if failed) */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * External order source identification
 */
export type ExternalOrderSource = 'widget' | 'shopby' | 'admin';
