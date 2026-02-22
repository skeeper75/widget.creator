import { describe, it, expect } from 'vitest';
import {
  ShopbySyncRequestSchema,
  ShopbyOrderCreateSchema,
  ShopbyOrderStatusSchema,
  MesDispatchRequestSchema,
  MesStatusUpdateSchema,
  EdicusDesignCreateSchema,
} from '../../app/api/_lib/schemas/integration.js';

describe('ShopbySyncRequestSchema', () => {
  it('should default force to false', () => {
    const result = ShopbySyncRequestSchema.parse({});
    expect(result.force).toBe(false);
  });

  it('should accept force: true', () => {
    const result = ShopbySyncRequestSchema.parse({ force: true });
    expect(result.force).toBe(true);
  });
});

describe('ShopbyOrderCreateSchema', () => {
  const valid = {
    order_id: 'ord_123',
    shopby_product_id: 42,
    quantity: 100,
    customer_name: 'Hong',
    customer_email: 'hong@example.com',
  };

  it('should accept valid input', () => {
    const result = ShopbyOrderCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = ShopbyOrderCreateSchema.safeParse({
      ...valid, customer_email: 'bad',
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero quantity', () => {
    const result = ShopbyOrderCreateSchema.safeParse({ ...valid, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject negative shopby_product_id', () => {
    const result = ShopbyOrderCreateSchema.safeParse({ ...valid, shopby_product_id: -1 });
    expect(result.success).toBe(false);
  });

  it('should reject empty customer_name', () => {
    const result = ShopbyOrderCreateSchema.safeParse({ ...valid, customer_name: '' });
    expect(result.success).toBe(false);
  });
});

describe('ShopbyOrderStatusSchema', () => {
  it('should accept valid status', () => {
    const result = ShopbyOrderStatusSchema.safeParse({ status: 'shipped' });
    expect(result.success).toBe(true);
  });

  it('should accept status with tracking', () => {
    const result = ShopbyOrderStatusSchema.safeParse({
      status: 'shipped', tracking_number: 'TRACK123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty status', () => {
    const result = ShopbyOrderStatusSchema.safeParse({ status: '' });
    expect(result.success).toBe(false);
  });
});

describe('MesDispatchRequestSchema', () => {
  it('should accept empty input', () => {
    const result = MesDispatchRequestSchema.parse({});
    expect(result.production_memo).toBeUndefined();
  });

  it('should accept production memo', () => {
    const result = MesDispatchRequestSchema.parse({ production_memo: 'Rush order' });
    expect(result.production_memo).toBe('Rush order');
  });

  it('should reject memo > 500 chars', () => {
    const result = MesDispatchRequestSchema.safeParse({ production_memo: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('MesStatusUpdateSchema', () => {
  it('should accept valid mes_status', () => {
    const result = MesStatusUpdateSchema.safeParse({ mes_status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('should accept status with barcode', () => {
    const result = MesStatusUpdateSchema.safeParse({
      mes_status: 'completed', barcode: 'BC123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty mes_status', () => {
    const result = MesStatusUpdateSchema.safeParse({ mes_status: '' });
    expect(result.success).toBe(false);
  });
});

describe('EdicusDesignCreateSchema', () => {
  const valid = {
    order_id: 'ord_123',
    template_id: 'tmpl_001',
    render_data: { text: 'Hello' },
    output_url: 'https://s3.example.com/output.pdf',
  };

  it('should accept valid input', () => {
    const result = EdicusDesignCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject missing template_id', () => {
    const { template_id, ...rest } = valid;
    const result = EdicusDesignCreateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should accept empty render_data', () => {
    const result = EdicusDesignCreateSchema.safeParse({ ...valid, render_data: {} });
    expect(result.success).toBe(true);
  });
});
