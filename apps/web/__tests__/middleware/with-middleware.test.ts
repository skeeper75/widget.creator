import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware, type MiddlewareFn, type MiddlewareContext } from '../../app/api/_lib/middleware/with-middleware.js';
import { ApiError } from '../../app/api/_lib/middleware/error-handler.js';

function createRequest(url = 'http://localhost:3000/api/test'): NextRequest {
  return new NextRequest(url);
}

function createRouteContext(params: Record<string, string> = {}): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve(params) };
}

describe('withMiddleware', () => {
  it('should execute handler when no middleware', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const route = withMiddleware()(handler);

    const response = await route(createRequest(), createRouteContext());
    const body = await response.json();

    expect(handler).toHaveBeenCalledOnce();
    expect(body).toEqual({ ok: true });
  });

  it('should pass params from route context to middleware context', async () => {
    let capturedCtx: MiddlewareContext | undefined;
    const handler = vi.fn(async (_req: NextRequest, ctx: MiddlewareContext) => {
      capturedCtx = ctx;
      return NextResponse.json({ id: ctx.params.id });
    });

    const route = withMiddleware()(handler);
    await route(createRequest(), createRouteContext({ id: '42' }));

    expect(capturedCtx!.params).toEqual({ id: '42' });
  });

  it('should execute middleware in order', async () => {
    const order: number[] = [];

    const mw1: MiddlewareFn = async () => { order.push(1); };
    const mw2: MiddlewareFn = async () => { order.push(2); };
    const mw3: MiddlewareFn = async () => { order.push(3); };

    const handler = vi.fn(async () => {
      order.push(4);
      return NextResponse.json({});
    });

    const route = withMiddleware(mw1, mw2, mw3)(handler);
    await route(createRequest(), createRouteContext());

    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('should short-circuit when middleware returns a response', async () => {
    const mw1: MiddlewareFn = async () => {};
    const mw2: MiddlewareFn = async () => {
      return new NextResponse('Blocked', { status: 403 });
    };
    const mw3: MiddlewareFn = vi.fn(async () => {});
    const handler = vi.fn(async () => NextResponse.json({}));

    const route = withMiddleware(mw1, mw2, mw3)(handler);
    const response = await route(createRequest(), createRouteContext());

    expect(response.status).toBe(403);
    expect(mw3).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('should enrich context across middleware', async () => {
    const authMw: MiddlewareFn = async (_req, ctx) => {
      ctx.widgetToken = {
        sub: 'wgt_test',
        iss: 'widget.huni.co.kr',
        allowed_origins: [],
      } as any;
    };

    let capturedCtx: MiddlewareContext | undefined;
    const handler = vi.fn(async (_req: NextRequest, ctx: MiddlewareContext) => {
      capturedCtx = ctx;
      return NextResponse.json({ widget: ctx.widgetToken?.sub });
    });

    const route = withMiddleware(authMw)(handler);
    await route(createRequest(), createRouteContext());

    expect(capturedCtx!.widgetToken!.sub).toBe('wgt_test');
  });

  it('should catch errors and return RFC 7807 response', async () => {
    const mw: MiddlewareFn = async () => {
      throw new ApiError(
        'https://widget.huni.co.kr/errors/unauthorized',
        'Unauthorized',
        401,
        'Token expired',
      );
    };
    const handler = vi.fn(async () => NextResponse.json({}));

    const route = withMiddleware(mw)(handler);
    const response = await route(createRequest(), createRouteContext());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain('unauthorized');
    expect(body.detail).toBe('Token expired');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should catch handler errors', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Handler exploded');
    });

    const route = withMiddleware()(handler);
    const response = await route(createRequest(), createRouteContext());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.type).toContain('internal');
  });

  it('should apply CORS headers from context', async () => {
    const corsMw: MiddlewareFn = async (_req, ctx) => {
      ctx.corsHeaders = {
        'Access-Control-Allow-Origin': 'https://example.com',
        'Vary': 'Origin',
      };
    };

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const route = withMiddleware(corsMw)(handler);
    const response = await route(createRequest(), createRouteContext());

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('should apply rate limit headers from context', async () => {
    const rateMw: MiddlewareFn = async (_req, ctx) => {
      ctx.rateLimitHeaders = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': '1700000060',
      };
    };

    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const route = withMiddleware(rateMw)(handler);
    const response = await route(createRequest(), createRouteContext());

    expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('99');
  });
});
