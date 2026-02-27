import { describe, it, expect } from 'vitest';
import {
  CategoryTreeQuerySchema,
  ProductListQuerySchema,
  ProductPaperQuerySchema,
} from '../../app/api/_lib/schemas/catalog.js';

describe('CategoryTreeQuerySchema', () => {
  it('should set defaults for empty input', () => {
    const result = CategoryTreeQuerySchema.parse({});
    expect(result.include_inactive).toBe(false);
    expect(result.depth).toBeUndefined();
  });

  it('should coerce include_inactive string to boolean', () => {
    const result = CategoryTreeQuerySchema.parse({ include_inactive: 'true' });
    expect(result.include_inactive).toBe(true);
  });

  it('should coerce depth to number', () => {
    const result = CategoryTreeQuerySchema.parse({ depth: '2' });
    expect(result.depth).toBe(2);
  });

  it('should reject negative depth', () => {
    const result = CategoryTreeQuerySchema.safeParse({ depth: '-1' });
    expect(result.success).toBe(false);
  });
});

describe('ProductListQuerySchema', () => {
  it('should set defaults for empty input', () => {
    const result = ProductListQuerySchema.parse({});
    expect(result.is_active).toBe(true);
    expect(result.sort).toBe('display_order');
    expect(result.order).toBe('asc');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should accept valid category_id', () => {
    const result = ProductListQuerySchema.parse({ category_id: '1' });
    expect(result.category_id).toBe(1);
  });

  it('should accept valid sort values', () => {
    expect(ProductListQuerySchema.parse({ sort: 'name' }).sort).toBe('name');
    expect(ProductListQuerySchema.parse({ sort: 'created_at' }).sort).toBe('created_at');
    expect(ProductListQuerySchema.parse({ sort: 'display_order' }).sort).toBe('display_order');
  });

  it('should reject invalid sort value', () => {
    const result = ProductListQuerySchema.safeParse({ sort: 'invalid_column' });
    expect(result.success).toBe(false);
  });

  it('should accept search parameter', () => {
    const result = ProductListQuerySchema.parse({ search: 'booklet' });
    expect(result.search).toBe('booklet');
  });

  it('should reject search > 200 characters', () => {
    const result = ProductListQuerySchema.safeParse({ search: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('should reject limit > 100', () => {
    const result = ProductListQuerySchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });

  it('should coerce is_active boolean value', () => {
    // z.coerce.boolean() treats any truthy string as true
    const resultTrue = ProductListQuerySchema.parse({ is_active: true });
    expect(resultTrue.is_active).toBe(true);
    const resultFalse = ProductListQuerySchema.parse({ is_active: false });
    expect(resultFalse.is_active).toBe(false);
  });
});

describe('ProductPaperQuerySchema', () => {
  it('should accept empty input', () => {
    const result = ProductPaperQuerySchema.parse({});
    expect(result.cover_type).toBeUndefined();
  });

  it('should accept cover_type filter', () => {
    const result = ProductPaperQuerySchema.parse({ cover_type: 'glossy' });
    expect(result.cover_type).toBe('glossy');
  });
});
