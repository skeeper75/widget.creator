/**
 * Retry Utility with Exponential Backoff
 *
 * Provides configurable retry logic for external system calls.
 */

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Jitter factor (0-1) to add randomness to delay */
  jitterFactor: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.2,
};

/**
 * Standard retry configurations for different operation types
 */
export const RETRY_CONFIGS = {
  /** Product sync: 3 retries, 1s-30s */
  productSync: {
    ...DEFAULT_RETRY_CONFIG,
  } satisfies RetryConfig,

  /** Order dispatch: 3 retries, 1s-30s */
  orderDispatch: {
    ...DEFAULT_RETRY_CONFIG,
  } satisfies RetryConfig,

  /** Design render: 5 retries, 2s-60s */
  designRender: {
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    jitterFactor: 0.2,
  } satisfies RetryConfig,

  /** Status callback: 2 retries, 500ms-5s */
  statusCallback: {
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    jitterFactor: 0.1,
  } satisfies RetryConfig,
} as const;

/**
 * Calculate delay with exponential backoff and jitter
 *
 * Formula: delay = min(baseDelay * 2^attempt, maxDelay) * (1 + jitter * (random * 2 - 1))
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const { baseDelayMs, maxDelayMs, jitterFactor } = config;

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: multiply by (1 + jitter * (random * 2 - 1))
  // This creates a random factor between (1 - jitter) and (1 + jitter)
  const jitterMultiplier = 1 + jitterFactor * (Math.random() * 2 - 1);

  return Math.floor(cappedDelay * jitterMultiplier);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Error class for retry exhaustion
 */
export class RetryExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(`Retry exhausted after ${attempts} attempts: ${lastError.message}`);
    this.name = 'RetryExhaustedError';
  }
}

/**
 * Execute a function with retry and exponential backoff
 *
 * @param fn - Async function to execute
 * @param config - Partial retry configuration (merged with defaults)
 * @returns Result of the function
 * @throws RetryExhaustedError if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  const { maxRetries } = finalConfig;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't sleep after the last attempt
      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, finalConfig);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw new RetryExhaustedError(maxRetries + 1, lastError!);
}

/**
 * Execute a function with retry, returning a result object instead of throwing
 *
 * @param fn - Async function to execute
 * @param config - Partial retry configuration
 * @returns Object with success status and result/error
 */
export async function retryWithBackoffSafe<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<{ success: true; result: T } | { success: false; error: Error; attempts: number }> {
  try {
    const result = await retryWithBackoff(fn, config);
    return { success: true, result };
  } catch (error) {
    if (error instanceof RetryExhaustedError) {
      return { success: false, error: error.lastError, attempts: error.attempts };
    }
    return { success: false, error: error instanceof Error ? error : new Error(String(error)), attempts: 1 };
  }
}
