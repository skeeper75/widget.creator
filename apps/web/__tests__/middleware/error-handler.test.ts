import { describe, it, expect } from 'vitest';
import { ZodError, z } from 'zod';
import {
  ApiError,
  notFound,
  validationError,
  unauthorized,
  forbidden,
  conflict,
  invalidStateTransition,
  rateLimitExceeded,
  internalError,
  handleError,
} from '../../app/api/_lib/middleware/error-handler.js';

describe('ApiError', () => {
  it('should create an error with all properties', () => {
    const err = new ApiError(
      'https://widget.huni.co.kr/errors/test',
      'Test Error',
      400,
      'This is a test',
    );
    expect(err.type).toBe('https://widget.huni.co.kr/errors/test');
    expect(err.title).toBe('Test Error');
    expect(err.status).toBe(400);
    expect(err.detail).toBe('This is a test');
    expect(err.traceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('This is a test');
  });

  it('should include validation errors', () => {
    const errors = [{ field: 'name', code: 'too_small', message: 'Required' }];
    const err = new ApiError(
      'https://widget.huni.co.kr/errors/validation',
      'Validation Error',
      422,
      '1 error',
      errors,
    );
    expect(err.errors).toEqual(errors);
  });
});

describe('Factory functions', () => {
  it('notFound', () => {
    const err = notFound('Product', 42);
    expect(err.status).toBe(404);
    expect(err.detail).toBe('Product 42 not found');
    expect(err.type).toContain('not-found');
  });

  it('validationError', () => {
    const err = validationError([
      { field: 'qty', code: 'too_small', message: 'Min 1' },
      { field: 'name', code: 'invalid_type', message: 'Expected string' },
    ]);
    expect(err.status).toBe(422);
    expect(err.detail).toContain('2 errors');
    expect(err.errors).toHaveLength(2);
  });

  it('unauthorized', () => {
    const err = unauthorized('Token expired');
    expect(err.status).toBe(401);
    expect(err.detail).toBe('Token expired');
  });

  it('forbidden', () => {
    const err = forbidden();
    expect(err.status).toBe(403);
    expect(err.detail).toBe('Insufficient permissions');
  });

  it('conflict', () => {
    const err = conflict('Duplicate entry');
    expect(err.status).toBe(409);
    expect(err.detail).toBe('Duplicate entry');
  });

  it('invalidStateTransition', () => {
    const err = invalidStateTransition('cancelled', 'producing');
    expect(err.status).toBe(409);
    expect(err.detail).toContain("'cancelled'");
    expect(err.detail).toContain("'producing'");
  });

  it('rateLimitExceeded', () => {
    const err = rateLimitExceeded(100, 'min', 42);
    expect(err.status).toBe(429);
    expect(err.detail).toContain('100 req/min');
    expect((err as any).retryAfter).toBe(42);
  });

  it('internalError', () => {
    const err = internalError();
    expect(err.status).toBe(500);
    expect(err.type).toContain('internal');
  });
});

describe('handleError', () => {
  it('should convert ApiError to RFC 7807 response', async () => {
    const err = notFound('Category', 99);
    const response = handleError(err, '/api/v1/catalog/categories/99');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toBe('https://widget.huni.co.kr/errors/not-found');
    expect(body.title).toBe('Not Found');
    expect(body.status).toBe(404);
    expect(body.detail).toBe('Category 99 not found');
    expect(body.instance).toBe('/api/v1/catalog/categories/99');
    expect(body.trace_id).toBeDefined();
  });

  it('should include validation errors in response', async () => {
    const err = validationError([
      { field: 'quantity', code: 'too_small', message: 'Min 1', received: -5 },
    ]);
    const response = handleError(err, '/api/v1/pricing/quote');
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe('quantity');
    expect(body.errors[0].received).toBe(-5);
  });

  it('should convert ZodError to validation error response', async () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    let zodErr: ZodError;
    try {
      schema.parse({ name: 123, age: 'abc' });
      throw new Error('Should not reach here');
    } catch (e) {
      zodErr = e as ZodError;
    }

    const response = handleError(zodErr!, '/api/test');
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.type).toContain('validation');
    expect(body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('should convert unknown errors to 500 internal error', async () => {
    const response = handleError(new Error('something broke'), '/api/test');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.type).toContain('internal');
    expect(body.trace_id).toBeDefined();
  });

  it('should handle non-Error objects', async () => {
    const response = handleError('string error', '/api/test');
    const body = await response.json();

    expect(response.status).toBe(500);
  });

  it('should include retry_after for rate limit errors', async () => {
    const err = rateLimitExceeded(100, 'min', 42);
    const response = handleError(err, '/api/test');
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.retry_after).toBe(42);
  });
});
