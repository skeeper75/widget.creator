/**
 * Integration Module
 *
 * Core interfaces and utilities for external system integration.
 */

// Core types
export type {
  CircuitBreakerState,
  AdapterStatus,
  IntegrationAdapter,
  AdapterRegistry,
  ApiClientConfig,
  SyncResult,
  ExternalOrderSource,
} from './types.js';

// Circuit breaker
export type {
  CircuitBreakerConfig,
} from './circuit-breaker.js';

export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CIRCUIT_BREAKER_CONFIGS,
} from './circuit-breaker.js';

// Retry utility
export type {
  RetryConfig,
} from './retry.js';

export {
  DEFAULT_RETRY_CONFIG,
  RETRY_CONFIGS,
  calculateDelay,
  retryWithBackoff,
  retryWithBackoffSafe,
  RetryExhaustedError,
} from './retry.js';

// Adapter registry
export {
  InMemoryAdapterRegistry,
  getAdapterRegistry,
  initializeAdapterRegistry,
  resetAdapterRegistry,
} from './adapter-registry.js';
