/**
 * Unit tests for retry utility with exponential backoff
 *
 * Tests cover immediate success, retry logic, exhaustion,
 * exponential delay calculation, and jitter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryWithBackoff,
  retryWithBackoffSafe,
  calculateDelay,
  RetryExhaustedError,
  DEFAULT_RETRY_CONFIG,
} from '../retry.js';
import type { RetryConfig } from '../retry.js';

describe('calculateDelay', () => {
  it('should calculate exponential delay for attempt 0', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterFactor: 0,
    };

    const delay = calculateDelay(0, config);
    expect(delay).toBe(1000);
  });

  it('should double delay for each attempt', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterFactor: 0,
    };

    expect(calculateDelay(0, config)).toBe(1000);
    expect(calculateDelay(1, config)).toBe(2000);
    expect(calculateDelay(2, config)).toBe(4000);
    expect(calculateDelay(3, config)).toBe(8000);
  });

  it('should cap delay at maxDelayMs', () => {
    const config: RetryConfig = {
      maxRetries: 10,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      jitterFactor: 0,
    };

    expect(calculateDelay(10, config)).toBe(5000);
  });

  it('should apply jitter within expected range', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterFactor: 0.2,
    };

    for (let i = 0; i < 50; i++) {
      const delay = calculateDelay(0, config);
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(1200);
    }
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      jitterFactor: 0,
    });

    // Advance past first retry delay
    await vi.advanceTimersByTimeAsync(100);
    // Advance past second retry delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw RetryExhaustedError when all retries fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    const promise = retryWithBackoff(fn, {
      maxRetries: 2,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      jitterFactor: 0,
    });

    // Catch the promise to prevent unhandled rejection during timer advancement
    const caughtPromise = promise.catch((e: unknown) => e);

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    const error = await caughtPromise;
    expect(error).toBeInstanceOf(RetryExhaustedError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should include attempt count and last error in RetryExhaustedError', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('final error'));

    const promise = retryWithBackoff(fn, {
      maxRetries: 1,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      jitterFactor: 0,
    });

    const caughtPromise = promise.catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(100);

    const error = await caughtPromise;
    expect(error).toBeInstanceOf(RetryExhaustedError);
    const retryErr = error as RetryExhaustedError;
    expect(retryErr.attempts).toBe(2);
    expect(retryErr.lastError.message).toBe('final error');
  });

  it('should not retry when maxRetries is 0', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // maxRetries=0 means no retries, just the initial call
    // No sleep is needed since there are no retries
    await expect(
      retryWithBackoff(fn, { maxRetries: 0 })
    ).rejects.toThrow(RetryExhaustedError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use default config when no config provided', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('retryWithBackoffSafe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return success result on success', async () => {
    const fn = vi.fn().mockResolvedValue('data');

    const result = await retryWithBackoffSafe(fn, { maxRetries: 1 });

    expect(result).toEqual({ success: true, result: 'data' });
  });

  it('should return failure result when all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // maxRetries=0 means immediate failure, no delays
    const result = await retryWithBackoffSafe(fn, { maxRetries: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('fail');
      expect(result.attempts).toBe(1);
    }
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  it('should have expected defaults', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
    expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.2);
  });
});
