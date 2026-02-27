import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { withRateLimit, _resetRateLimitStore } from '../../app/api/_lib/middleware/rate-limit.js';
import { ApiError } from '../../app/api/_lib/middleware/error-handler.js';
import type { MiddlewareContext } from '../../app/api/_lib/middleware/with-middleware.js';

function createRequest(ip = '127.0.0.1'): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    headers: { 'x-forwarded-for': ip },
  });
}

function createContext(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
  return { params: {}, ...overrides };
}

describe('withRateLimit', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  it('should allow requests within limit', async () => {
    const req = createRequest();
    const ctx = createContext();
    const mw = withRateLimit('anonymous');

    await mw(req, ctx);

    expect(ctx.rateLimitHeaders).toBeDefined();
    expect(ctx.rateLimitHeaders!['X-RateLimit-Limit']).toBe('30');
    expect(Number(ctx.rateLimitHeaders!['X-RateLimit-Remaining'])).toBeLessThanOrEqual(29);
  });

  it('should throw 429 when limit exceeded for anonymous', async () => {
    const mw = withRateLimit('anonymous');

    // Make 30 requests (anonymous limit)
    for (let i = 0; i < 30; i++) {
      const req = createRequest('1.2.3.4');
      const ctx = createContext();
      await mw(req, ctx);
    }

    // 31st request should fail
    const req = createRequest('1.2.3.4');
    const ctx = createContext();
    await expect(mw(req, ctx)).rejects.toThrow(ApiError);

    try {
      await mw(createRequest('1.2.3.4'), createContext());
    } catch (e) {
      expect((e as ApiError).status).toBe(429);
    }
  });

  it('should use widget token key for widget-token type', async () => {
    const mw = withRateLimit('widget-token');
    const req = createRequest();
    const ctx = createContext({
      widgetToken: {
        sub: 'wgt_abc',
        iss: 'widget.huni.co.kr',
        allowed_origins: [],
      } as any,
    });

    await mw(req, ctx);

    expect(ctx.rateLimitHeaders!['X-RateLimit-Limit']).toBe('100');
  });

  it('should use API key for api-key type', async () => {
    const mw = withRateLimit('api-key');
    const req = createRequest();
    const ctx = createContext({
      apiKey: { clientId: 'client_test' },
    });

    await mw(req, ctx);

    expect(ctx.rateLimitHeaders!['X-RateLimit-Limit']).toBe('1000');
  });

  it('should use admin session for admin type', async () => {
    const mw = withRateLimit('admin');
    const req = createRequest();
    const ctx = createContext({
      session: { user: { id: 'user1', email: 'admin@test.com', role: 'ADMIN' } },
    });

    await mw(req, ctx);

    expect(ctx.rateLimitHeaders!['X-RateLimit-Limit']).toBe('5000');
  });

  it('should track different IPs separately', async () => {
    const mw = withRateLimit('anonymous');

    // Exhaust limit for IP 1
    for (let i = 0; i < 30; i++) {
      await mw(createRequest('10.0.0.1'), createContext());
    }

    // IP 2 should still work
    const ctx = createContext();
    await mw(createRequest('10.0.0.2'), ctx);
    expect(ctx.rateLimitHeaders).toBeDefined();
  });
});
