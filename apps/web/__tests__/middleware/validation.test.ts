import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withValidation } from '../../app/api/_lib/middleware/validation.js';
import { ApiError } from '../../app/api/_lib/middleware/error-handler.js';
import type { MiddlewareContext } from '../../app/api/_lib/middleware/with-middleware.js';

function createRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  query?: Record<string, string>;
}): NextRequest {
  const { method = 'POST', body, query } = options;
  let url = options.url || 'http://localhost:3000/api/test';
  if (query) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  return new NextRequest(url, init);
}

function createContext(params: Record<string, string> = {}): MiddlewareContext {
  return { params };
}

describe('withValidation', () => {
  describe('body validation', () => {
    const schema = z.object({
      name: z.string().min(1),
      quantity: z.number().int().min(1),
    });

    it('should validate valid body and store in context', async () => {
      const req = createRequest({ body: { name: 'test', quantity: 10 } });
      const ctx = createContext();
      const mw = withValidation(schema, 'body');

      const result = await mw(req, ctx);

      expect(result).toBeUndefined();
      expect(ctx.validatedBody).toEqual({ name: 'test', quantity: 10 });
    });

    it('should throw validation error for invalid body', async () => {
      const req = createRequest({ body: { name: '', quantity: -5 } });
      const ctx = createContext();
      const mw = withValidation(schema, 'body');

      await expect(mw(req, ctx)).rejects.toThrow(ApiError);
      try {
        await mw(createRequest({ body: { name: '', quantity: -5 } }), createContext());
      } catch (e) {
        const err = e as ApiError;
        expect(err.status).toBe(422);
        expect(err.errors).toBeDefined();
        expect(err.errors!.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should throw for invalid JSON body', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'text/plain' },
      });
      const ctx = createContext();
      const mw = withValidation(schema, 'body');

      await expect(mw(req, ctx)).rejects.toThrow(ApiError);
    });
  });

  describe('query validation', () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });

    it('should validate valid query params', async () => {
      const req = createRequest({ method: 'GET', query: { page: '2', limit: '50' } });
      const ctx = createContext();
      const mw = withValidation(schema, 'query');

      const result = await mw(req, ctx);

      expect(result).toBeUndefined();
      expect(ctx.validatedQuery).toEqual({ page: 2, limit: 50 });
    });

    it('should apply defaults for missing query params', async () => {
      const req = createRequest({ method: 'GET' });
      const ctx = createContext();
      const mw = withValidation(schema, 'query');

      await mw(req, ctx);

      expect(ctx.validatedQuery).toEqual({ page: 1, limit: 20 });
    });

    it('should throw for invalid query params', async () => {
      const req = createRequest({ method: 'GET', query: { page: '-1' } });
      const ctx = createContext();
      const mw = withValidation(schema, 'query');

      await expect(mw(req, ctx)).rejects.toThrow(ApiError);
    });
  });

  describe('params validation', () => {
    const schema = z.object({
      id: z.coerce.number().int().positive(),
    });

    it('should validate route params', async () => {
      const req = createRequest({ method: 'GET' });
      const ctx = createContext({ id: '42' });
      const mw = withValidation(schema, 'params');

      await mw(req, ctx);

      expect(ctx.validatedParams).toEqual({ id: 42 });
    });

    it('should throw for invalid params', async () => {
      const req = createRequest({ method: 'GET' });
      const ctx = createContext({ id: 'abc' });
      const mw = withValidation(schema, 'params');

      await expect(mw(req, ctx)).rejects.toThrow(ApiError);
    });
  });
});
