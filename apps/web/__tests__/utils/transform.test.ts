import { describe, it, expect } from 'vitest';
import { toSnakeCase, toCamelCase } from '../../app/api/_lib/utils/transform.js';

describe('toSnakeCase', () => {
  it('should convert camelCase keys to snake_case', () => {
    const input = { productName: 'Test', isActive: true };
    const result = toSnakeCase(input);
    expect(result).toEqual({ product_name: 'Test', is_active: true });
  });

  it('should handle nested objects', () => {
    const input = { outerKey: { innerKey: 'value' } };
    const result = toSnakeCase(input);
    expect(result).toEqual({ outer_key: { inner_key: 'value' } });
  });

  it('should handle arrays of objects', () => {
    const input = [{ productId: 1 }, { productId: 2 }];
    const result = toSnakeCase(input);
    expect(result).toEqual([{ product_id: 1 }, { product_id: 2 }]);
  });

  it('should handle nested arrays', () => {
    const input = {
      items: [{ itemName: 'A' }, { itemName: 'B' }],
    };
    const result = toSnakeCase(input);
    expect(result).toEqual({
      items: [{ item_name: 'A' }, { item_name: 'B' }],
    });
  });

  it('should return null/undefined as-is', () => {
    expect(toSnakeCase(null)).toBeNull();
    expect(toSnakeCase(undefined)).toBeUndefined();
  });

  it('should return primitives as-is', () => {
    expect(toSnakeCase('hello')).toBe('hello');
    expect(toSnakeCase(42)).toBe(42);
    expect(toSnakeCase(true)).toBe(true);
  });

  it('should convert Date to ISO string', () => {
    const date = new Date('2026-01-15T10:30:00Z');
    const result = toSnakeCase({ createdAt: date });
    expect(result).toEqual({ created_at: '2026-01-15T10:30:00.000Z' });
  });

  it('should handle keys that are already snake_case', () => {
    const input = { already_snake: 'value' };
    const result = toSnakeCase(input);
    expect(result).toEqual({ already_snake: 'value' });
  });

  it('should handle empty objects', () => {
    expect(toSnakeCase({})).toEqual({});
  });

  it('should handle empty arrays', () => {
    expect(toSnakeCase([])).toEqual([]);
  });

  it('should handle deeply nested structures', () => {
    const input = {
      levelOne: {
        levelTwo: {
          levelThree: { deepValue: 'found' },
        },
      },
    };
    const result = toSnakeCase(input);
    expect(result).toEqual({
      level_one: {
        level_two: {
          level_three: { deep_value: 'found' },
        },
      },
    });
  });
});

describe('toCamelCase', () => {
  it('should convert snake_case keys to camelCase', () => {
    const input = { product_name: 'Test', is_active: true };
    const result = toCamelCase(input);
    expect(result).toEqual({ productName: 'Test', isActive: true });
  });

  it('should handle nested objects', () => {
    const input = { outer_key: { inner_key: 'value' } };
    const result = toCamelCase(input);
    expect(result).toEqual({ outerKey: { innerKey: 'value' } });
  });

  it('should handle arrays of objects', () => {
    const input = [{ product_id: 1 }, { product_id: 2 }];
    const result = toCamelCase(input);
    expect(result).toEqual([{ productId: 1 }, { productId: 2 }]);
  });

  it('should return null/undefined as-is', () => {
    expect(toCamelCase(null)).toBeNull();
    expect(toCamelCase(undefined)).toBeUndefined();
  });

  it('should handle keys that are already camelCase', () => {
    const input = { alreadyCamel: 'value' };
    const result = toCamelCase(input);
    expect(result).toEqual({ alreadyCamel: 'value' });
  });
});
