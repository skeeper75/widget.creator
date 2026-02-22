import { describe, it, expect } from 'vitest';
import {
  PaginationQuerySchema,
  IdParamSchema,
  ProblemDetailSchema,
  SearchQuerySchema,
  CoerceBooleanSchema,
} from '../../app/api/_lib/schemas/common.js';

describe('PaginationQuerySchema', () => {
  it('should set defaults for empty input', () => {
    const result = PaginationQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.order).toBe('asc');
  });

  it('should coerce string numbers', () => {
    const result = PaginationQuerySchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('should reject page < 1', () => {
    const result = PaginationQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('should reject limit > 100', () => {
    const result = PaginationQuerySchema.safeParse({ limit: '150' });
    expect(result.success).toBe(false);
  });

  it('should reject limit < 1', () => {
    const result = PaginationQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('should accept valid order values', () => {
    expect(PaginationQuerySchema.parse({ order: 'asc' }).order).toBe('asc');
    expect(PaginationQuerySchema.parse({ order: 'desc' }).order).toBe('desc');
  });

  it('should reject invalid order value', () => {
    const result = PaginationQuerySchema.safeParse({ order: 'random' });
    expect(result.success).toBe(false);
  });
});

describe('IdParamSchema', () => {
  it('should parse valid numeric id', () => {
    const result = IdParamSchema.parse({ id: '42' });
    expect(result.id).toBe(42);
  });

  it('should coerce string to number', () => {
    const result = IdParamSchema.parse({ id: '100' });
    expect(result.id).toBe(100);
  });

  it('should reject non-positive id', () => {
    const result = IdParamSchema.safeParse({ id: '0' });
    expect(result.success).toBe(false);
  });

  it('should reject negative id', () => {
    const result = IdParamSchema.safeParse({ id: '-1' });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer id', () => {
    const result = IdParamSchema.safeParse({ id: '3.14' });
    expect(result.success).toBe(false);
  });

  it('should reject non-numeric string', () => {
    const result = IdParamSchema.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('ProblemDetailSchema', () => {
  it('should validate a complete RFC 7807 object', () => {
    const result = ProblemDetailSchema.safeParse({
      type: 'https://widget.huni.co.kr/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'Resource not found',
      instance: '/api/v1/test',
    });
    expect(result.success).toBe(true);
  });

  it('should validate with errors array', () => {
    const result = ProblemDetailSchema.safeParse({
      type: 'https://widget.huni.co.kr/errors/validation',
      title: 'Validation Error',
      status: 422,
      detail: '1 error',
      instance: '/api/v1/test',
      errors: [{ field: 'name', code: 'too_small', message: 'Required' }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject status outside 4xx-5xx range', () => {
    const result = ProblemDetailSchema.safeParse({
      type: 'test', title: 'OK', status: 200, detail: 'fine', instance: '/api',
    });
    expect(result.success).toBe(false);
  });
});

describe('SearchQuerySchema', () => {
  it('should accept valid search string', () => {
    const result = SearchQuerySchema.parse({ search: 'booklet' });
    expect(result.search).toBe('booklet');
  });

  it('should accept empty search', () => {
    const result = SearchQuerySchema.parse({});
    expect(result.search).toBeUndefined();
  });

  it('should reject search > 200 chars', () => {
    const result = SearchQuerySchema.safeParse({ search: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe('CoerceBooleanSchema', () => {
  it('should coerce "true" to true', () => {
    expect(CoerceBooleanSchema.parse('true')).toBe(true);
  });

  it('should coerce "false" to false', () => {
    expect(CoerceBooleanSchema.parse('false')).toBe(false);
  });

  it('should pass through boolean true', () => {
    expect(CoerceBooleanSchema.parse(true)).toBe(true);
  });

  it('should pass through boolean false', () => {
    expect(CoerceBooleanSchema.parse(false)).toBe(false);
  });

  it('should coerce arbitrary string to false', () => {
    expect(CoerceBooleanSchema.parse('yes')).toBe(false);
  });
});
