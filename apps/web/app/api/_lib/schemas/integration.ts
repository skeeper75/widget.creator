import { z } from 'zod';

/**
 * Shopby product sync request (REQ-050).
 */
export const ShopbySyncRequestSchema = z.object({
  force: z.boolean().default(false),
});

/**
 * Shopby order creation request (REQ-050).
 */
export const ShopbyOrderCreateSchema = z.object({
  order_id: z.string(),
  shopby_product_id: z.number().int().positive(),
  quantity: z.number().int().min(1),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
});

/**
 * Shopby order status update request (REQ-050).
 */
export const ShopbyOrderStatusSchema = z.object({
  status: z.string().min(1),
  tracking_number: z.string().optional(),
});

/**
 * MES order dispatch request (REQ-051).
 */
export const MesDispatchRequestSchema = z.object({
  production_memo: z.string().max(500).optional(),
});

/**
 * MES order status update (callback) request (REQ-051).
 */
export const MesStatusUpdateSchema = z.object({
  mes_status: z.string().min(1),
  barcode: z.string().optional(),
});

/**
 * Edicus design creation request (REQ-052).
 */
export const EdicusDesignCreateSchema = z.object({
  order_id: z.string(),
  template_id: z.string(),
  render_data: z.record(z.unknown()),
  output_url: z.string(),
});
