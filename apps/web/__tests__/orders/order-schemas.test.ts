import { describe, it, expect } from 'vitest';
import {
  CreateOrderSchema,
  ListOrdersQuerySchema,
  UpdateOrderStatusSchema,
  FileUploadRequestSchema,
  VALID_TRANSITIONS,
  maskPhone,
  generateFileNumber,
  type OrderStatus,
} from '../../app/api/_lib/schemas/orders.js';

// ─── CreateOrderSchema ─────────────────────────────────────────

describe('CreateOrderSchema', () => {
  const validInput = {
    quote_data: {
      product_id: 42,
      size_id: 15,
      paper_id: 8,
      print_mode_id: 4,
      quantity: 500,
      page_count: 100,
      calculated_price: 38060,
      breakdown: { print_cost: 15000, paper_cost: 8500 },
    },
    customer: {
      name: 'Hong',
      email: 'hong@example.com',
      phone: '010-1234-5678',
      company: 'Test Co',
    },
    shipping: {
      method: 'delivery' as const,
      address: 'Seoul',
      postal_code: '06142',
    },
    widget_id: 'wgt_xxxxx',
  };

  it('should accept valid input', () => {
    const result = CreateOrderSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject missing product_id', () => {
    const input = {
      ...validInput,
      quote_data: { ...validInput.quote_data, product_id: undefined },
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative quantity', () => {
    const input = {
      ...validInput,
      quote_data: { ...validInput.quote_data, quantity: -5 },
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const input = {
      ...validInput,
      customer: { ...validInput.customer, email: 'not-an-email' },
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid shipping method', () => {
    const input = {
      ...validInput,
      shipping: { ...validInput.shipping, method: 'drone' },
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should default post_processes to empty array', () => {
    const result = CreateOrderSchema.safeParse(validInput);
    if (result.success) {
      expect(result.data.quote_data.post_processes).toEqual([]);
    }
  });

  it('should accept all three shipping methods', () => {
    for (const method of ['delivery', 'quick', 'pickup'] as const) {
      const input = {
        ...validInput,
        shipping: { ...validInput.shipping, method },
      };
      const result = CreateOrderSchema.safeParse(input);
      expect(result.success, `method '${method}' should be valid`).toBe(true);
    }
  });

  it('should reject zero quantity', () => {
    const input = {
      ...validInput,
      quote_data: { ...validInput.quote_data, quantity: 0 },
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject zero calculated_price', () => {
    const input = {
      ...validInput,
      quote_data: { ...validInput.quote_data, calculated_price: 0 },
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept optional widget_id', () => {
    const { widget_id, ...inputWithoutWidget } = validInput;
    const result = CreateOrderSchema.safeParse(inputWithoutWidget);
    expect(result.success).toBe(true);
  });
});

// ─── ListOrdersQuerySchema ─────────────────────────────────────

describe('ListOrdersQuerySchema', () => {
  it('should set defaults for empty input', () => {
    const result = ListOrdersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sort).toBe('created_at');
      expect(result.data.order).toBe('desc');
    }
  });

  it('should coerce string numbers', () => {
    const result = ListOrdersQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject limit > 100', () => {
    const result = ListOrdersQuerySchema.safeParse({ limit: '150' });
    expect(result.success).toBe(false);
  });

  it('should accept valid status filter', () => {
    const result = ListOrdersQuerySchema.safeParse({ status: 'paid' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = ListOrdersQuerySchema.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
  });

  it('should accept all valid sort values', () => {
    for (const sort of ['created_at', 'total_price', 'order_number']) {
      const result = ListOrdersQuerySchema.safeParse({ sort });
      expect(result.success, `sort '${sort}' should be valid`).toBe(true);
    }
  });

  it('should reject invalid sort value', () => {
    const result = ListOrdersQuerySchema.safeParse({ sort: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should accept email filter', () => {
    const result = ListOrdersQuerySchema.safeParse({
      customer_email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });
});

// ─── UpdateOrderStatusSchema ───────────────────────────────────

describe('UpdateOrderStatusSchema', () => {
  it('should accept valid status', () => {
    const result = UpdateOrderStatusSchema.safeParse({ status: 'paid' });
    expect(result.success).toBe(true);
  });

  it('should accept status with memo', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      status: 'producing',
      memo: 'Production started',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = UpdateOrderStatusSchema.safeParse({ status: 'flying' });
    expect(result.success).toBe(false);
  });

  it('should accept status with tracking number', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      status: 'shipped',
      tracking_number: 'TRACK123456',
    });
    expect(result.success).toBe(true);
  });

  it('should accept status with estimated_date', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      status: 'producing',
      estimated_date: '2026-03-01',
    });
    expect(result.success).toBe(true);
  });
});

// ─── FileUploadRequestSchema ───────────────────────────────────

describe('FileUploadRequestSchema', () => {
  it('should accept valid PDF upload', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'design.pdf',
      content_type: 'application/pdf',
      file_size: 15728640,
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid image upload', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'photo.jpeg',
      content_type: 'image/jpeg',
      file_size: 5000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject file > 500MB', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'huge.pdf',
      content_type: 'application/pdf',
      file_size: 600_000_000,
    });
    expect(result.success).toBe(false);
  });

  it('should reject disallowed MIME type', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'malware.exe',
      content_type: 'application/octet-stream',
      file_size: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('should accept postscript files', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'design.ai',
      content_type: 'application/postscript',
      file_size: 10000000,
    });
    expect(result.success).toBe(true);
  });

  it('should accept TIFF images', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'scan.tiff',
      content_type: 'image/tiff',
      file_size: 50000000,
    });
    expect(result.success).toBe(true);
  });

  it('should accept PNG images', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'image.png',
      content_type: 'image/png',
      file_size: 2000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty filename', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: '',
      content_type: 'application/pdf',
      file_size: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('should accept file at exactly 500MB', () => {
    const result = FileUploadRequestSchema.safeParse({
      filename: 'max.pdf',
      content_type: 'application/pdf',
      file_size: 524_288_000,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Order State Machine (REQ-033) ─────────────────────────────

describe('Order State Machine (REQ-033)', () => {
  describe('valid transitions', () => {
    const validCases: [OrderStatus, OrderStatus][] = [
      ['unpaid', 'paid'],
      ['unpaid', 'cancelled'],
      ['paid', 'production_waiting'],
      ['paid', 'cancelled'],
      ['production_waiting', 'producing'],
      ['production_waiting', 'cancelled'],
      ['producing', 'production_done'],
      ['production_done', 'shipped'],
    ];

    it.each(validCases)(
      'should allow transition from %s to %s',
      (from, to) => {
        expect(VALID_TRANSITIONS[from]).toContain(to);
      },
    );
  });

  describe('invalid transitions', () => {
    const invalidCases: [OrderStatus, OrderStatus][] = [
      ['shipped', 'unpaid'],
      ['cancelled', 'producing'],
      ['cancelled', 'paid'],
      ['cancelled', 'unpaid'],
      ['unpaid', 'producing'],
      ['unpaid', 'production_waiting'],
      ['unpaid', 'production_done'],
      ['unpaid', 'shipped'],
      ['paid', 'producing'],
      ['paid', 'shipped'],
      ['producing', 'paid'],
      ['producing', 'shipped'],
      ['production_done', 'producing'],
    ];

    it.each(invalidCases)(
      'should NOT allow transition from %s to %s',
      (from, to) => {
        expect(VALID_TRANSITIONS[from]).not.toContain(to);
      },
    );
  });

  describe('terminal states', () => {
    it('shipped should be terminal', () => {
      expect(VALID_TRANSITIONS.shipped).toEqual([]);
    });

    it('cancelled should be terminal', () => {
      expect(VALID_TRANSITIONS.cancelled).toEqual([]);
    });
  });
});

// ─── maskPhone ─────────────────────────────────────────────────

describe('maskPhone', () => {
  it('should mask the middle digits of a phone number', () => {
    expect(maskPhone('010-1234-5678')).toBe('010-****-5678');
  });

  it('should handle numbers without hyphens', () => {
    expect(maskPhone('01012345678')).toBe('010-****-5678');
  });

  it('should handle 3-digit middle section', () => {
    expect(maskPhone('010-123-5678')).toBe('010-****-5678');
  });
});

// ─── generateFileNumber ────────────────────────────────────────

describe('generateFileNumber', () => {
  it('should generate the correct file number format', () => {
    const result = generateFileNumber({
      huniCode: '1001',
      productName: 'wireless-booklet',
      size: '148x210',
      printMode: 'D',
      paper: 'art250',
      company: 'testCo',
      customerName: 'hong',
      shopbyId: '30146712',
      qty: 500,
      ext: 'pdf',
    });

    expect(result).toBe(
      '1001_wireless-booklet_148x210_D_art250_testCo_hong_30146712_00500ea.pdf',
    );
  });

  it('should pad quantity to 5 digits', () => {
    const result = generateFileNumber({
      huniCode: '1001',
      productName: 'test',
      size: 'A5',
      printMode: 'S',
      paper: 'moj',
      company: 'co',
      customerName: 'user',
      shopbyId: '123',
      qty: 1,
      ext: 'ai',
    });

    expect(result).toContain('00001ea.ai');
  });

  it('should handle large quantities', () => {
    const result = generateFileNumber({
      huniCode: '1001',
      productName: 'test',
      size: 'A4',
      printMode: 'D',
      paper: 'art',
      company: 'co',
      customerName: 'user',
      shopbyId: '1',
      qty: 99999,
      ext: 'pdf',
    });

    expect(result).toContain('99999ea.pdf');
  });
});
