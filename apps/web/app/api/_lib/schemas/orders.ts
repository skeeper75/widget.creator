import { z } from 'zod';

/**
 * Order status enum (REQ-033).
 */
export const OrderStatusSchema = z.enum([
  'unpaid',
  'paid',
  'production_waiting',
  'producing',
  'production_done',
  'shipped',
  'cancelled',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/**
 * Valid state transitions per REQ-033.
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  unpaid: ['paid', 'cancelled'],
  paid: ['production_waiting', 'cancelled'],
  production_waiting: ['producing', 'cancelled'],
  producing: ['production_done'],
  production_done: ['shipped'],
  shipped: [],
  cancelled: [],
};

/**
 * Create Order request body (REQ-030).
 */
export const CreateOrderSchema = z.object({
  quote_data: z.object({
    product_id: z.number().int().positive(),
    size_id: z.number().int().positive(),
    paper_id: z.number().int().positive().optional(),
    print_mode_id: z.number().int().positive().optional(),
    quantity: z.number().int().min(1),
    page_count: z.number().int().min(1).optional(),
    binding_id: z.number().int().positive().optional(),
    post_processes: z
      .array(
        z.object({
          id: z.number().int().positive(),
          sub_option: z.string().optional(),
        }),
      )
      .default([]),
    calculated_price: z.number().positive(),
    breakdown: z.record(z.unknown()),
  }),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(1),
    company: z.string().max(200).optional(),
  }),
  shipping: z.object({
    method: z.enum(['delivery', 'quick', 'pickup']),
    address: z.string().min(1).max(500).optional(),
    postal_code: z.string().optional(),
    memo: z.string().max(500).optional(),
  }),
  widget_id: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/**
 * List Orders query parameters (REQ-031).
 */
export const ListOrdersQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  customer_email: z.string().email().optional(),
  widget_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.enum(['created_at', 'total_price', 'order_number']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;

/**
 * Update Order Status request body (REQ-033).
 */
export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  memo: z.string().max(500).optional(),
  estimated_date: z.string().optional(),
  tracking_number: z.string().max(100).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

/**
 * File Upload request body (REQ-034).
 */
export const FileUploadRequestSchema = z.object({
  filename: z.string().min(1).max(500),
  content_type: z.enum([
    'application/pdf',
    'application/postscript',
    'image/jpeg',
    'image/png',
    'image/tiff',
  ]),
  file_size: z.number().int().positive().max(524_288_000), // 500MB
});

export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;

/**
 * Mask phone number for list responses (REQ-031 data privacy).
 */
export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})-?\d{3,4}-?(\d{4})/, '$1-****-$2');
}

/**
 * Generate file_number from order details (REQ-034).
 * Format: {huniCode}_{productName}_{size}_{printMode}_{paper}_{company}_{customerName}_{shopbyId}_{qty}ea.{ext}
 */
export function generateFileNumber(params: {
  huniCode: string;
  productName: string;
  size: string;
  printMode: string;
  paper: string;
  company: string;
  customerName: string;
  shopbyId: string;
  qty: number;
  ext: string;
}): string {
  const {
    huniCode,
    productName,
    size,
    printMode,
    paper,
    company,
    customerName,
    shopbyId,
    qty,
    ext,
  } = params;
  const qtyPadded = String(qty).padStart(5, '0');
  return `${huniCode}_${productName}_${size}_${printMode}_${paper}_${company}_${customerName}_${shopbyId}_${qtyPadded}ea.${ext}`;
}
