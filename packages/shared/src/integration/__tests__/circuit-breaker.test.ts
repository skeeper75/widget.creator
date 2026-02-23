/**
 * Unit tests for CircuitBreaker
 *
 * Tests cover state transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED),
 * failure thresholds, cooldown periods, and adapter-specific configs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CIRCUIT_BREAKER_CONFIGS,
} from '../circuit-breaker.js';
import type { CircuitBreakerConfig } from '../circuit-breaker.js';

const TEST_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  cooldownMs: 5000,
  name: 'test',
};

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    cb = new CircuitBreaker(TEST_CONFIG);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should allow requests initially', () => {
      expect(cb.isAllowed()).toBe(true);
    });
  });

  describe('CLOSED state', () => {
    it('should execute function successfully when CLOSED', async () => {
      const result = await cb.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should stay CLOSED when failures are below threshold', async () => {
      // Fail (threshold - 1) times
      for (let i = 0; i < TEST_CONFIG.failureThreshold - 1; i++) {
        await expect(
          cb.execute(() => Promise.reject(new Error('fail')))
        ).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      for (let i = 0; i < TEST_CONFIG.failureThreshold; i++) {
        await expect(
          cb.execute(() => Promise.reject(new Error('fail')))
        ).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('OPEN state', () => {
    async function openCircuit(): Promise<void> {
      for (let i = 0; i < TEST_CONFIG.failureThreshold; i++) {
        await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }
    }

    it('should throw CircuitBreakerOpenError immediately when OPEN', async () => {
      await openCircuit();

      await expect(
        cb.execute(() => Promise.resolve('should not run'))
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should return false from isAllowed() when OPEN', async () => {
      await openCircuit();

      expect(cb.isAllowed()).toBe(false);
    });

    it('should include circuit breaker name in error', async () => {
      await openCircuit();

      try {
        await cb.execute(() => Promise.resolve('x'));
        // Should not reach here
        expect.fail('Expected CircuitBreakerOpenError');
      } catch (err) {
        expect(err).toBeInstanceOf(CircuitBreakerOpenError);
        expect((err as CircuitBreakerOpenError).circuitBreakerName).toBe('test');
      }
    });
  });

  describe('OPEN -> HALF_OPEN transition', () => {
    async function openCircuit(): Promise<void> {
      for (let i = 0; i < TEST_CONFIG.failureThreshold; i++) {
        await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }
    }

    it('should transition to HALF_OPEN after cooldown period', async () => {
      await openCircuit();
      expect(cb.getState()).toBe('OPEN');

      vi.advanceTimersByTime(TEST_CONFIG.cooldownMs);

      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('should remain OPEN before cooldown completes', async () => {
      await openCircuit();

      vi.advanceTimersByTime(TEST_CONFIG.cooldownMs - 1);

      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('HALF_OPEN state', () => {
    async function getToHalfOpen(): Promise<void> {
      for (let i = 0; i < TEST_CONFIG.failureThreshold; i++) {
        await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }
      vi.advanceTimersByTime(TEST_CONFIG.cooldownMs);
    }

    it('should transition to CLOSED on successful execution', async () => {
      await getToHalfOpen();
      expect(cb.getState()).toBe('HALF_OPEN');

      await cb.execute(() => Promise.resolve('recovered'));

      expect(cb.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure', async () => {
      await getToHalfOpen();
      expect(cb.getState()).toBe('HALF_OPEN');

      await expect(
        cb.execute(() => Promise.reject(new Error('still failing')))
      ).rejects.toThrow('still failing');

      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', async () => {
      for (let i = 0; i < TEST_CONFIG.failureThreshold; i++) {
        await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }
      expect(cb.getState()).toBe('OPEN');

      cb.reset();

      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('getStats', () => {
    it('should return correct stats after failures', async () => {
      await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

      const stats = cb.getStats();

      expect(stats.name).toBe('test');
      expect(stats.failureCount).toBe(1);
      expect(stats.lastFailureTime).toBeInstanceOf(Date);
      expect(stats.lastSuccessTime).toBeNull();
    });

    it('should return correct stats after success', async () => {
      await cb.execute(() => Promise.resolve('ok'));

      const stats = cb.getStats();

      expect(stats.failureCount).toBe(0);
      expect(stats.lastSuccessTime).toBeInstanceOf(Date);
    });
  });

  describe('adapter-specific configurations', () => {
    it('should have Shopby config: 5 failures, 60000ms cooldown', () => {
      expect(CIRCUIT_BREAKER_CONFIGS.shopby.failureThreshold).toBe(5);
      expect(CIRCUIT_BREAKER_CONFIGS.shopby.cooldownMs).toBe(60000);
      expect(CIRCUIT_BREAKER_CONFIGS.shopby.name).toBe('shopby');
    });

    it('should have MES config: 5 failures, 60000ms cooldown', () => {
      expect(CIRCUIT_BREAKER_CONFIGS.mes.failureThreshold).toBe(5);
      expect(CIRCUIT_BREAKER_CONFIGS.mes.cooldownMs).toBe(60000);
      expect(CIRCUIT_BREAKER_CONFIGS.mes.name).toBe('mes');
    });

    it('should have Edicus config: 3 failures, 30000ms cooldown', () => {
      expect(CIRCUIT_BREAKER_CONFIGS.edicus.failureThreshold).toBe(3);
      expect(CIRCUIT_BREAKER_CONFIGS.edicus.cooldownMs).toBe(30000);
      expect(CIRCUIT_BREAKER_CONFIGS.edicus.name).toBe('edicus');
    });

    it('should open Shopby circuit breaker after 5 failures', async () => {
      const shopbyCb = new CircuitBreaker(CIRCUIT_BREAKER_CONFIGS.shopby);

      for (let i = 0; i < 5; i++) {
        await shopbyCb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }

      expect(shopbyCb.getState()).toBe('OPEN');
    });

    it('should open Edicus circuit breaker after 3 failures', async () => {
      const edicusCb = new CircuitBreaker(CIRCUIT_BREAKER_CONFIGS.edicus);

      for (let i = 0; i < 3; i++) {
        await edicusCb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }

      expect(edicusCb.getState()).toBe('OPEN');
    });
  });
});
