import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '../../app/api/_lib/middleware/cors.js';
import type { MiddlewareContext } from '../../app/api/_lib/middleware/with-middleware.js';

function createRequest(method: string, origin?: string): NextRequest {
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  return new NextRequest('http://localhost:3000/api/test', {
    method,
    headers,
  });
}

function createContext(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
  return { params: {}, ...overrides };
}

describe('withCors', () => {
  describe('public scope', () => {
    it('should set wildcard origin', async () => {
      const req = createRequest('GET', 'https://any.com');
      const ctx = createContext();
      const mw = withCors('public');

      await mw(req, ctx);

      expect(ctx.corsHeaders).toBeDefined();
      expect(ctx.corsHeaders!['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should handle OPTIONS preflight', async () => {
      const req = createRequest('OPTIONS', 'https://any.com');
      const ctx = createContext();
      const mw = withCors('public');

      const result = await mw(req, ctx);

      expect(result).toBeInstanceOf(NextResponse);
      expect(result!.status).toBe(204);
      expect(result!.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('admin scope', () => {
    it('should allow admin origin', async () => {
      const req = createRequest('GET', 'http://localhost:3000');
      const ctx = createContext();
      const mw = withCors('admin');

      await mw(req, ctx);

      expect(ctx.corsHeaders!['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(ctx.corsHeaders!['Vary']).toBe('Origin');
    });

    it('should not set CORS for non-admin origin', async () => {
      const req = createRequest('GET', 'https://evil.com');
      const ctx = createContext();
      const mw = withCors('admin');

      await mw(req, ctx);

      expect(ctx.corsHeaders).toBeUndefined();
    });
  });

  describe('widget scope', () => {
    it('should allow origin from widget token', async () => {
      const req = createRequest('GET', 'https://shop.example.com');
      const ctx = createContext({
        widgetToken: {
          sub: 'wgt_test',
          iss: 'widget.huni.co.kr',
          allowed_origins: ['https://shop.example.com'],
        } as any,
      });
      const mw = withCors('widget');

      await mw(req, ctx);

      expect(ctx.corsHeaders!['Access-Control-Allow-Origin']).toBe('https://shop.example.com');
    });

    it('should not set CORS for non-matching origin', async () => {
      const req = createRequest('GET', 'https://evil.com');
      const ctx = createContext({
        widgetToken: {
          sub: 'wgt_test',
          iss: 'widget.huni.co.kr',
          allowed_origins: ['https://shop.example.com'],
        } as any,
      });
      const mw = withCors('widget');

      await mw(req, ctx);

      expect(ctx.corsHeaders).toBeUndefined();
    });
  });

  describe('integration scope', () => {
    it('should not set any CORS headers', async () => {
      const req = createRequest('GET');
      const ctx = createContext();
      const mw = withCors('integration');

      const result = await mw(req, ctx);

      expect(result).toBeUndefined();
      expect(ctx.corsHeaders).toBeUndefined();
    });
  });
});
