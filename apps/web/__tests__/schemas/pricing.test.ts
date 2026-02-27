import { describe, it, expect } from 'vitest';
import {
  QuoteRequestSchema,
  QuotePreviewRequestSchema,
  PriceTierQuerySchema,
  FixedPriceQuerySchema,
} from '../../app/api/_lib/schemas/pricing.js';

describe('QuoteRequestSchema', () => {
  const validInput = {
    product_id: 42,
    size_id: 15,
    quantity: 500,
  };

  it('should accept minimal valid input', () => {
    const result = QuoteRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should default post_processes to empty array', () => {
    const result = QuoteRequestSchema.parse(validInput);
    expect(result.post_processes).toEqual([]);
  });

  it('should default accessories to empty array', () => {
    const result = QuoteRequestSchema.parse(validInput);
    expect(result.accessories).toEqual([]);
  });

  it('should accept all optional fields', () => {
    const result = QuoteRequestSchema.safeParse({
      ...validInput,
      paper_id: 8,
      print_mode_id: 4,
      page_count: 100,
      binding_id: 3,
      post_processes: [{ id: 12, sub_option: '1line' }],
      accessories: [{ product_id: 99, quantity: 10 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing product_id', () => {
    const result = QuoteRequestSchema.safeParse({ size_id: 15, quantity: 500 });
    expect(result.success).toBe(false);
  });

  it('should reject missing size_id', () => {
    const result = QuoteRequestSchema.safeParse({ product_id: 42, quantity: 500 });
    expect(result.success).toBe(false);
  });

  it('should reject quantity < 1', () => {
    const result = QuoteRequestSchema.safeParse({ ...validInput, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject quantity > 100000', () => {
    const result = QuoteRequestSchema.safeParse({ ...validInput, quantity: 100001 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer product_id', () => {
    const result = QuoteRequestSchema.safeParse({ ...validInput, product_id: 3.5 });
    expect(result.success).toBe(false);
  });

  it('should reject negative product_id', () => {
    const result = QuoteRequestSchema.safeParse({ ...validInput, product_id: -1 });
    expect(result.success).toBe(false);
  });
});

describe('QuotePreviewRequestSchema', () => {
  it('should accept minimal input (product_id + quantity)', () => {
    const result = QuotePreviewRequestSchema.safeParse({
      product_id: 42,
      quantity: 100,
    });
    expect(result.success).toBe(true);
  });

  it('should accept all optional fields', () => {
    const result = QuotePreviewRequestSchema.safeParse({
      product_id: 42,
      quantity: 100,
      size_id: 15,
      paper_id: 8,
      print_mode_id: 4,
      page_count: 100,
      binding_id: 3,
    });
    expect(result.success).toBe(true);
  });

  it('should reject quantity > 100000', () => {
    const result = QuotePreviewRequestSchema.safeParse({
      product_id: 42,
      quantity: 200000,
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing product_id', () => {
    const result = QuotePreviewRequestSchema.safeParse({ quantity: 100 });
    expect(result.success).toBe(false);
  });
});

describe('PriceTierQuerySchema', () => {
  it('should accept empty input', () => {
    const result = PriceTierQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept option_code filter', () => {
    const result = PriceTierQuerySchema.parse({ option_code: 'PRINT_D' });
    expect(result.option_code).toBe('PRINT_D');
  });

  it('should coerce price_table_id to number', () => {
    const result = PriceTierQuerySchema.parse({ price_table_id: '5' });
    expect(result.price_table_id).toBe(5);
  });
});

describe('FixedPriceQuerySchema', () => {
  it('should accept empty input', () => {
    const result = FixedPriceQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should coerce all optional fields to numbers', () => {
    const result = FixedPriceQuerySchema.parse({
      size_id: '15',
      paper_id: '8',
      print_mode_id: '4',
    });
    expect(result.size_id).toBe(15);
    expect(result.paper_id).toBe(8);
    expect(result.print_mode_id).toBe(4);
  });

  it('should reject non-positive size_id', () => {
    const result = FixedPriceQuerySchema.safeParse({ size_id: '0' });
    expect(result.success).toBe(false);
  });
});
