/**
 * Order test fixture data for SPEC-WIDGET-API-001.
 * Covers order creation, state transitions, and file upload scenarios.
 */

// ─── Order status constants ─────────────────────────────────────

export const ORDER_STATUSES = [
  'unpaid',
  'paid',
  'production_waiting',
  'producing',
  'production_done',
  'shipped',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Valid state transitions per SPEC REQ-033. */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  unpaid: ['paid', 'cancelled'],
  paid: ['production_waiting', 'cancelled'],
  production_waiting: ['producing', 'cancelled'],
  producing: ['production_done'],
  production_done: ['shipped'],
  shipped: [],
  cancelled: [],
};

/** Invalid transitions that must return 409. */
export const INVALID_TRANSITIONS: Array<{ from: string; to: string }> = [
  { from: 'shipped', to: 'unpaid' },
  { from: 'cancelled', to: 'producing' },
  { from: 'cancelled', to: 'paid' },
  { from: 'unpaid', to: 'producing' },
  { from: 'unpaid', to: 'production_waiting' },
  { from: 'producing', to: 'paid' },
  { from: 'production_done', to: 'unpaid' },
];

// ─── Order creation data ────────────────────────────────────────

export const VALID_ORDER_REQUEST = {
  quote_data: {
    product_id: 42,
    size_id: 15,
    paper_id: 8,
    print_mode_id: 4,
    quantity: 500,
    page_count: 100,
    binding_id: 3,
    post_processes: [{ id: 12, sub_option: '1line' }],
    calculated_price: 38060,
    breakdown: {
      print_cost: 15000,
      paper_cost: 8500,
      coating_cost: 3000,
      binding_cost: 5000,
      postprocess_cost: 2000,
      accessory_cost: 1100,
      subtotal: 34600,
      vat: 3460,
      total: 38060,
    },
  },
  customer: {
    name: '홍길동',
    email: 'hong@example.com',
    phone: '010-1234-5678',
    company: '테스트 회사',
  },
  shipping: {
    method: 'delivery' as const,
    address: '서울시 강남구 테헤란로 123',
    postal_code: '06142',
    memo: '부재시 경비실에 맡겨주세요',
  },
  widget_id: 'wgt_test_001',
};

export const SAMPLE_ORDER = {
  id: 'ord_abc123',
  orderNumber: 'HN-20260222-0001',
  status: 'unpaid' as OrderStatus,
  totalPrice: 38060,
  currency: 'KRW',
  customer: {
    name: '홍길동',
    email: 'hong@example.com',
    phone: '010-1234-5678',
    company: '테스트 회사',
  },
  productSummary: '무선책자 A5 500부',
  hasDesignFile: false,
  createdAt: new Date('2026-02-22T10:30:00Z'),
  updatedAt: new Date('2026-02-22T10:30:00Z'),
};

// ─── File upload data ───────────────────────────────────────────

export const VALID_FILE_UPLOAD_REQUEST = {
  filename: 'design_final.pdf',
  content_type: 'application/pdf',
  file_size: 15728640, // ~15MB
};

export const OVERSIZED_FILE_UPLOAD_REQUEST = {
  filename: 'huge_file.pdf',
  content_type: 'application/pdf',
  file_size: 600_000_000, // 600MB, exceeds 500MB limit
};

export const INVALID_MIME_FILE_UPLOAD_REQUEST = {
  filename: 'archive.zip',
  content_type: 'application/zip',
  file_size: 1_000_000,
};

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/postscript',
  'image/jpeg',
  'image/png',
  'image/tiff',
];

export const MAX_FILE_SIZE = 524_288_000; // 500MB
