/**
 * Circuit Breaker Implementation
 *
 * Prevents cascading failures by stopping calls to failing external systems.
 */

import type { CircuitBreakerState } from './types.js';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before attempting to half-open */
  cooldownMs: number;
  /** Name for logging purposes */
  name: string;
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly circuitBreakerName: string,
    public readonly status: CircuitBreakerState
  ) {
    super(`Circuit breaker '${circuitBreakerName}' is ${status}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Circuit Breaker implementation
 *
 * State transitions:
 * - CLOSED (normal) -> OPEN: after failureThreshold consecutive failures
 * - OPEN -> HALF_OPEN: after cooldownMs
 * - HALF_OPEN -> CLOSED: if test request succeeds
 * - HALF_OPEN -> OPEN: if test request fails
 *
 * When OPEN: throws CircuitBreakerOpenError immediately (fast-fail)
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;

  constructor(private readonly config: CircuitBreakerConfig) {}

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    this.maybeTransitionToHalfOpen();
    return this.state;
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }

  /**
   * Execute a function through the circuit breaker
   *
   * @throws CircuitBreakerOpenError if circuit is open
   * @throws The original error if the function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should transition to half-open
    this.maybeTransitionToHalfOpen();

    // Fast-fail if circuit is open
    if (this.state === 'OPEN') {
      throw new CircuitBreakerOpenError(this.config.name, this.state);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if circuit breaker allows requests
   */
  isAllowed(): boolean {
    this.maybeTransitionToHalfOpen();
    return this.state !== 'OPEN';
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailureTime: Date | null;
    lastSuccessTime: Date | null;
    name: string;
  } {
    this.maybeTransitionToHalfOpen();
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      name: this.config.name,
    };
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN') {
      // Test request failed, go back to open
      this.state = 'OPEN';
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Threshold reached, open the circuit
      this.state = 'OPEN';
    }
  }

  /**
   * Check if we should transition from OPEN to HALF_OPEN
   */
  private maybeTransitionToHalfOpen(): void {
    if (
      this.state === 'OPEN' &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime.getTime() >= this.config.cooldownMs
    ) {
      this.state = 'HALF_OPEN';
    }
  }
}

/**
 * Circuit breaker configurations for different adapters
 */
export const CIRCUIT_BREAKER_CONFIGS = {
  /** Shopby: 5 failures, 60s cooldown */
  shopby: {
    failureThreshold: 5,
    cooldownMs: 60000,
    name: 'shopby',
  } satisfies CircuitBreakerConfig,

  /** MES: 5 failures, 60s cooldown */
  mes: {
    failureThreshold: 5,
    cooldownMs: 60000,
    name: 'mes',
  } satisfies CircuitBreakerConfig,

  /** Edicus: 3 failures, 30s cooldown */
  edicus: {
    failureThreshold: 3,
    cooldownMs: 30000,
    name: 'edicus',
  } satisfies CircuitBreakerConfig,
} as const;
