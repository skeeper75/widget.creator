import { NextRequest } from 'next/server';
import { rateLimitExceeded } from './error-handler.js';
import type { MiddlewareFn, MiddlewareContext } from './with-middleware.js';

export type RateLimitType = 'widget-token' | 'api-key' | 'admin' | 'anonymous';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  windowLabel: string;
}

const RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
  'widget-token': { maxRequests: 100, windowMs: 60_000, windowLabel: 'min' },
  'api-key': { maxRequests: 1000, windowMs: 60_000, windowLabel: 'min' },
  admin: { maxRequests: 5000, windowMs: 60_000, windowLabel: 'min' },
  anonymous: { maxRequests: 30, windowMs: 60_000, windowLabel: 'min' },
};

interface SlidingWindowEntry {
  timestamps: number[];
}

// In-memory store for rate limiting
const store = new Map<string, SlidingWindowEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs * 2;
  for (const [key, entry] of store) {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < cutoff) {
      store.delete(key);
    }
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function getRateLimitKey(req: NextRequest, type: RateLimitType, ctx: MiddlewareContext): string {
  const ip = getClientIp(req);
  switch (type) {
    case 'widget-token': {
      const widgetId = ctx.widgetToken?.sub || 'unknown';
      return `wt:${widgetId}:${ip}`;
    }
    case 'api-key': {
      const clientId = ctx.apiKey?.clientId || 'unknown';
      return `ak:${clientId}`;
    }
    case 'admin': {
      const userId = ctx.session?.user?.id || 'unknown';
      return `jwt:${userId}`;
    }
    case 'anonymous':
      return `anon:${ip}`;
  }
}

/**
 * Sliding window rate limiter middleware.
 * Sets X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers.
 * Throws 429 when limit exceeded.
 */
export function withRateLimit(type: RateLimitType): MiddlewareFn {
  return async (req, ctx) => {
    const config = RATE_LIMITS[type];
    const key = getRateLimitKey(req, type, ctx);
    const now = Date.now();

    cleanup(config.windowMs);

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove timestamps outside the sliding window
    const windowStart = now - config.windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
    const resetAt = Math.ceil((now + config.windowMs) / 1000);

    // Set rate limit headers in context for the final response
    ctx.rateLimitHeaders = {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(Math.max(0, remaining - 1)),
      'X-RateLimit-Reset': String(resetAt),
    };

    if (entry.timestamps.length >= config.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfter = Math.ceil((oldestInWindow + config.windowMs - now) / 1000);
      throw rateLimitExceeded(config.maxRequests, config.windowLabel, retryAfter);
    }

    entry.timestamps.push(now);
  };
}

/**
 * Reset the rate limit store. For testing only.
 */
export function _resetRateLimitStore(): void {
  store.clear();
}
